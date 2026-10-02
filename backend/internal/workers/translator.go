package workers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"ai-toolbox/internal/config"
	"ai-toolbox/internal/jobs"
)

type TranslatorWorker struct {
	config *config.Config
}

func NewTranslatorWorker(cfg *config.Config) *TranslatorWorker {
	return &TranslatorWorker{config: cfg}
}

func (w *TranslatorWorker) Process(
	ctx context.Context,
	job *jobs.Job,
	inputPath string,
	cfg map[string]any,
	onProgress ProgressCallback,
) (string, []byte, any, error) {
	sourceLang := "en"
	if src, ok := cfg["sourceLanguage"].(string); ok && src != "" {
		sourceLang = src
	}

	targetLang := "ne"
	if tgt, ok := cfg["targetLanguage"].(string); ok && tgt != "" {
		targetLang = tgt
	}

	var sourceText string
	if inputPath != "" {
		if fileBytes, err := os.ReadFile(inputPath); err == nil {
			sourceText = string(fileBytes)
		}
	}
	if sourceText == "" {
		if textInputVal, ok := cfg["textInput"].(string); ok {
			sourceText = textInputVal
		}
	}

	sourceText = strings.TrimSpace(sourceText)
	if sourceText == "" {
		return "", nil, nil, fmt.Errorf("no source text or document was provided for translation")
	}

	// STRICT REAL AI MODE (MOCK_AI=false)
	if !w.config.MockAI {
		ollamaURL := w.config.OllamaURL + "/api/generate"
		onProgress(20, fmt.Sprintf("Connecting to local NMT model via Ollama (%s)...", w.config.OllamaModel))

		prompt := fmt.Sprintf("Translate the following text accurately from %s to %s. Output ONLY the translated text without extra conversational commentary:\n\n%s", sourceLang, targetLang, sourceText)
		reqBody, _ := json.Marshal(map[string]any{
			"model":  w.config.OllamaModel,
			"prompt": prompt,
			"stream": false,
		})

		req, err := http.NewRequestWithContext(ctx, "POST", ollamaURL, bytes.NewReader(reqBody))
		if err != nil {
			return "", nil, nil, fmt.Errorf("failed to create translation request: %v", err)
		}

		req.Header.Set("Content-Type", "application/json")
		client := &http.Client{Timeout: 90 * time.Second}
		onProgress(60, "Running neural sequence-to-sequence translation...")
		resp, err := client.Do(req)
		if err != nil {
			return "", nil, nil, fmt.Errorf("The required AI processing model is not installed or configured: Local Neural Machine Translation model (Ollama at '%s') is not reachable. Please start Ollama ('ollama run %s') or set MOCK_AI=true for development mode.", w.config.OllamaURL, w.config.OllamaModel)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return "", nil, nil, fmt.Errorf("Ollama NMT model returned error status %d. Verify model '%s' is loaded with 'ollama run %s'.", resp.StatusCode, w.config.OllamaModel, w.config.OllamaModel)
		}

		var ollamaResp struct {
			Response string `json:"response"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&ollamaResp); err != nil || strings.TrimSpace(ollamaResp.Response) == "" {
			return "", nil, nil, fmt.Errorf("Ollama NMT model returned an empty translation response")
		}

		onProgress(95, "Formatting localized output text...")
		translatedText := strings.TrimSpace(ollamaResp.Response)
		outFilename := fmt.Sprintf("translation_%s_to_%s.txt", sourceLang, targetLang)
		if job != nil && job.InputFilename != "" {
			ext := filepath.Ext(job.InputFilename)
			if ext == "" {
				ext = ".txt"
			}
			base := strings.TrimSuffix(job.InputFilename, ext)
			outFilename = fmt.Sprintf("%s_translated_%s%s", base, targetLang, ext)
		}
		outData := []byte(translatedText)

		return outFilename, outData, map[string]any{
			"translatedText": translatedText,
			"sourceLanguage": sourceLang,
			"targetLanguage": targetLang,
			"wordCount":      len(strings.Fields(translatedText)),
			"outputFilename": outFilename,
		}, nil
	}

	// DEVELOPMENT / MOCK MODE (MOCK_AI=true)
	stages := []struct {
		pct   int
		stage string
		dur   time.Duration
	}{
		{25, "Tokenizing sentence segments & language detection (Mock)", 250 * time.Millisecond},
		{55, "Applying neural sequence-to-sequence beam search (Mock)", 350 * time.Millisecond},
		{85, "Post-processing grammar agreement & lexical alignment (Mock)", 300 * time.Millisecond},
		{95, "Formatting localized output text (Mock)", 150 * time.Millisecond},
	}

	for _, s := range stages {
		select {
		case <-ctx.Done():
			return "", nil, nil, ctx.Err()
		case <-time.After(s.dur):
			onProgress(s.pct, s.stage)
		}
	}

	translatedText := translateTextDynamic(sourceText, sourceLang, targetLang)
	outFilename := fmt.Sprintf("translation_%s_to_%s.txt", sourceLang, targetLang)
	if job != nil && job.InputFilename != "" {
		ext := filepath.Ext(job.InputFilename)
		if ext == "" {
			ext = ".txt"
		}
		base := strings.TrimSuffix(job.InputFilename, ext)
		outFilename = fmt.Sprintf("%s_translated_%s%s", base, targetLang, ext)
	}
	outData := []byte(translatedText)

	result := map[string]any{
		"translatedText": translatedText,
		"sourceLanguage": sourceLang,
		"targetLanguage": targetLang,
		"wordCount":      len(strings.Fields(translatedText)),
		"outputFilename": outFilename,
	}

	return outFilename, outData, result, nil
}

// Full bilingual dictionary for English to Nepali
var enToNePhrases = map[string]string{
	"hello":                       "नमस्ते",
	"hi":                          "नमस्ते",
	"how are you":                 "तपाईंलाई कस्तो छ?",
	"how are you?":                "तपाईंलाई कस्तो छ?",
	"i am fine":                   "म ठीक छु",
	"i am good":                   "म ठीक छु",
	"thank you":                   "धन्यवाद",
	"thank you very much":         "धेरै धेरै धन्यवाद",
	"good morning":                "शुभ प्रभात",
	"good afternoon":              "शुभ दिउँसो",
	"good evening":                "शुभ सन्ध्या",
	"good night":                  "शुभ रात्रि",
	"welcome":                     "तपाईंलाई स्वागत छ",
	"welcome to":                  "स्वागत छ",
	"what is your name":           "तपाईंको नाम के हो?",
	"what is your name?":          "तपाईंको नाम के हो?",
	"my name is":                  "मेरो नाम हो",
	"see you later":               "पछि भेटौँला",
	"goodbye":                     "बिदा / शुभ यात्रा",
	"bye":                         "अलविदा",
	"yes":                         "हो",
	"no":                          "होइन",
	"please":                      "कृपया",
	"sorry":                       "माफ गर्नुहोस्",
	"excuse me":                   "सुन्नुहोस् त",
	"i love you":                  "म तिमीलाई माया गर्छु",
	"where are you":               "तपाईं कहाँ हुनुहुन्छ?",
	"what are you doing":          "तपाईं के गर्दै हुनुहुन्छ?",
	"i am learning":               "म सिक्दै छु",
	"this is good":                "यो राम्रो छ",
	"artificial intelligence":     "कृत्रिम बुद्धिमत्ता (AI)",
	"machine learning":            "मेसिन लर्निङ",
	"computer science":            "कम्प्युटर विज्ञान",
	"software engineering":        "सफ्टवेयर इन्जिनियरिङ",
	"data science":                "डाटा विज्ञान",
	"privacy first":               "गोपनीयता पहिलो प्राथमिकता",
	"open source":                 "खुला स्रोत",
	"local server":                "स्थानीय सर्भर",
	"have a nice day":             "तपाईंको दिन शुभ रहोस्",
	"congratulations":             "बधाई छ",
	"happy birthday":              "जन्मदिनको शुभकामना",
	"happy new year":              "नयाँ वर्षको शुभकामना",
	"i need help":                 "मलाई मद्दत चाहिन्छ",
	"can you help me":             "के तपाईं मलाई मद्दत गर्न सक्नुहुन्छ?",
	"what time is it":             "अहिले कति बज्यो?",
	"how much is this":            "यसको कति पर्छ?",
	"where is the bathroom":       "शौचालय कहाँ छ?",
	"i don't understand":          "मैले बुझिनँ",
	"i understand":                "मैले बुझेँ",
	"speak slowly":                "बिस्तारै बोल्नुहोस्",
}

var enToNeWords = map[string]string{
	// Pronouns
	"i":          "म",
	"me":         "मलाई",
	"my":         "मेरो",
	"mine":       "मेरो",
	"you":        "तपाईं",
	"your":       "तपाईंको",
	"yours":      "तपाईंको",
	"he":         "उहाँ / ऊ",
	"his":        "उहाँको / उसको",
	"him":        "उहाँलाई / उसलाई",
	"she":        "उनी / उहाँ",
	"her":        "उनको / उहाँको",
	"we":         "हामी",
	"our":        "हाम्रो",
	"ours":       "हाम्रो",
	"us":         "हामीलाई",
	"they":       "उनीहरू",
	"them":       "उनीहरूलाई",
	"their":      "उनीहरूको",
	"it":         "यो",
	"its":        "यसको",
	"this":       "यो",
	"that":       "त्यो",
	"these":      "यी",
	"those":      "ती",
	"a":          "एउटा",
	"an":         "एउटा",
	"the":        "त्यो",

	// Verbs & Auxiliaries
	"is":         "हो",
	"am":         "छु",
	"are":        "हुन् / छन्",
	"was":        "थियो",
	"were":       "थिए",
	"be":         "हुनु",
	"been":       "भएको",
	"loves":      "माया गर्छ",
	"likes":      "मन पराउँछ",
	"works":      "काम गर्छ",
	"studies":    "अध्ययन गर्छ",
	"reads":      "पढ्छ",
	"writes":     "लेख्छ",
	"plays":      "खेल्छ",
	"lives":      "बस्छ",
	"helps":      "मद्दत गर्छ",
	"have":       "छ / मसँग छ",
	"has":        "छ",
	"had":        "थियो",
	"do":         "गर्नु",
	"does":       "गर्छ",
	"did":        "गर्यो",
	"will":       "हुनेछ / गर्नेछ",
	"would":      "गर्नेथियो",
	"can":        "सक्नु",
	"could":      "सक्थ्यो",
	"should":     "पर्छ",
	"must":       "पर्छ",
	"go":         "जानु",
	"goes":       "जान्छ",
	"going":      "जाँदै",
	"went":       "गयो",
	"come":       "आउनु",
	"comes":      "आउँछ",
	"came":       "आयो",
	"coming":     "आउँदै",
	"see":        "हेर्नु",
	"saw":        "हेर्यो",
	"seen":       "देखेको",
	"look":       "हेर्नु",
	"read":       "पढ्नु",
	"reading":    "पढ्दै",
	"write":      "लेख्नु",
	"writing":    "लेख्दै",
	"written":    "लेखिएको",
	"learn":      "सिक्नु",
	"learning":   "सिक्दै",
	"study":      "अध्ययन गर्नु",
	"studying":   "अध्ययन गर्दै",
	"speak":      "बोल्नु",
	"speaking":   "बोल्दै",
	"talk":       "कुरा गर्नु",
	"listen":     "सुन्नु",
	"hear":       "सुन्नु",
	"eat":        "खानु",
	"eating":     "खाँदै",
	"drink":      "पिउनु",
	"drinking":   "पिउँदै",
	"sleep":      "सुत्नु",
	"wake":       "उठ्नु",
	"work":       "काम",
	"working":    "काम गर्दै",
	"play":       "खेल्नु",
	"playing":    "खेल्दै",
	"run":        "दौडनु",
	"running":    "दौडँदै",
	"walk":       "हिँड्नु",
	"walking":    "हिँड्दै",
	"make":       "बनाउनु",
	"making":     "बनाउँदै",
	"build":      "निर्माण गर्नु",
	"create":     "सिर्जना गर्नु",
	"buy":        "किन्नु",
	"sell":       "बेच्नु",
	"give":       "दिनु",
	"take":       "लिनु",
	"know":       "थाहा हुनु",
	"think":      "सोच्नु",
	"feel":       "महसुस गर्नु",
	"help":       "मद्दत गर्नु",
	"love":       "माया गर्नु",
	"like":       "मन पराउनु",
	"want":       "चाहनु",
	"need":       "आवश्यक हुनु",
	"use":        "प्रयोग गर्नु",
	"using":      "प्रयोग गर्दै",

	// Nouns
	"student":    "विद्यार्थी",
	"teacher":    "शिक्षक",
	"doctor":     "डाक्टर / चिकित्सक",
	"engineer":   "इन्जिनियर",
	"scientist":  "वैज्ञानिक",
	"family":     "परिवार",
	"father":     "बुबा",
	"mother":     "आमा",
	"brother":    "दाजु / भाइ",
	"sister":     "दीदी / बहिनी",
	"son":        "छोरा",
	"daughter":   "छोरी",
	"friend":     "साथी",
	"friends":    "साथीहरू",
	"person":     "व्यक्ति",
	"people":     "मानिसहरू",
	"man":        "पुरुष / मानिस",
	"woman":      "महिला",
	"child":      "बच्चा",
	"children":   "बालबालिका",
	"boy":        "केटा",
	"girl":       "केटी",
	"home":       "घर",
	"house":      "घर",
	"room":       "कोठा",
	"school":     "विद्यालय",
	"college":    "कलेज",
	"university": "विश्वविद्यालय",
	"office":     "कार्यालय",
	"hospital":   "अस्पताल",
	"market":     "बजार",
	"city":       "सहर",
	"village":    "गाउँ",
	"country":    "देश",
	"world":      "संसार",
	"book":       "किताब",
	"pen":        "कलम",
	"paper":      "कागज",
	"computer":   "कम्प्युटर",
	"laptop":     "ल्यापटप",
	"phone":      "फोन / मोबाइल",
	"internet":   "इन्टरनेट",
	"system":     "प्रणाली",
	"server":     "सर्भर",
	"database":   "डाटाबेस",
	"code":       "कोड",
	"program":    "कार्यक्रम",
	"software":   "सफ्टवेयर",
	"hardware":   "हार्डवेयर",
	"model":      "मोडल",
	"tool":       "उपकरण",
	"water":      "पानी",
	"food":       "खाना",
	"tea":        "चिया",
	"coffee":     "कफी",
	"rice":       "भात / चामल",
	"bread":      "रोटी",
	"fruit":      "फलफूल",
	"apple":      "स्याउ",
	"banana":     "केरा",
	"car":        "गाडी",
	"bus":        "बस",
	"train":      "रेल",
	"plane":      "हवाईजहाज",
	"road":       "सडक / बाटो",
	"tree":       "रुख",
	"flower":     "फूल",
	"sun":        "सूर्य / घाम",
	"moon":       "चन्द्रमा",
	"star":       "तारा",
	"sky":        "आकाश",
	"earth":      "पृथ्वी",
	"weather":    "मौसम",
	"rain":       "पानी / वर्षा",
	"wind":       "हावा",
	"mountain":   "हिमाल / पहाड",
	"river":      "नदी",
	"dog":        "कुकुर",
	"cat":        "बिरालो",
	"bird":       "चरा",
	"money":      "पैसा",
	"price":      "मूल्य",
	"time":       "समय",
	"hour":       "घण्टा",
	"minute":     "मिनेट",
	"day":        "दिन",
	"night":      "रात",
	"week":       "हप्ता",
	"month":      "महिना",
	"year":       "वर्ष",
	"today":      "आज",
	"tomorrow":   "भोलि",
	"yesterday":  "हिजो",
	"morning":    "बिहान",
	"evening":    "साँझ",
	"name":       "नाम",
	"life":       "जीवन",
	"health":     "स्वास्थ्य",
	"peace":      "शान्ति",

	// Adjectives
	"good":       "राम्रो",
	"great":      "उत्कृष्ट",
	"bad":        "नराम्रो",
	"big":        "ठूलो",
	"small":      "सानो",
	"hot":        "तातो / गर्मी",
	"cold":       "चिसो",
	"fast":       "छिटो",
	"slow":       "ढिलो",
	"easy":       "सजिलो",
	"hard":       "गाह्रो",
	"difficult":  "कठिन",
	"simple":     "सरल",
	"happy":      "खुसी",
	"sad":        "दुःखी",
	"beautiful":  "सुन्दर",
	"clean":      "सफा",
	"new":        "नयाँ",
	"old":        "पुरानो",
	"young":      "जवान",
	"rich":       "धनी",
	"poor":       "गरिब",
	"smart":      "चतुर / स्मार्ट",
	"intelligent":"बुद्धिमान",
	"strong":     "बलियो",
	"weak":       "कमजोर",
	"important":  "महत्वपूर्ण",
	"free":       "निःशुल्क / स्वतन्त्र",
	"private":    "निजी / गोप्य",
	"secure":     "सुरक्षित",
	"local":      "स्थानीय",
	"global":     "विश्वव्यापी",
	"right":      "सही / दायाँ",
	"wrong":      "गलत",
	"true":       "साँचो",
	"false":      "झूटो",

	// Connectors & Prepositions
	"and":        "र",
	"or":         "वा",
	"but":        "तर",
	"because":    "किनभने",
	"if":         "यदि",
	"so":         "त्यसैले",
	"then":       "त्यसपछि",
	"with":       "साथमा / ले",
	"without":    "बिना",
	"in":         "मा",
	"on":         "मा / माथि",
	"at":         "मा",
	"to":         "लाई / तिर",
	"from":       "बाट",
	"for":        "को लागि",
	"of":         "को",
	"by":         "द्वारा",
	"about":      "बारेमा",
	"under":      "मुनि",
	"over":       "माथि",
	"before":     "अगाडि",
	"after":      "पछाडि",
	"very":       "धेरै",
	"much":       "धेरै",
	"many":       "धेरै",
	"all":        "सबै",
	"some":       "केही",
	"more":       "थप / बढी",
	"less":       "कम",
	"now":        "अहिले",
	"always":     "सधैं",
	"never":      "कहिल्यै",
	"here":       "यहाँ",
	"there":      "त्यहाँ",
	"where":      "कहाँ",
	"when":       "कहिले",
	"why":        "किन",
	"how":        "कसरी",
	"what":       "के",
	"who":        "को",
	"which":      "कुन",
}

// Nepali to English Dictionary
var neToEnWords = map[string]string{
	"म":          "I",
	"मलाई":       "Me / To me",
	"मेरो":       "My / Mine",
	"तपाईं":      "You",
	"तपाईंको":    "Your",
	"उहाँ":       "He / She",
	"हामी":       "We",
	"हाम्रो":     "Our",
	"उनीहरू":     "They",
	"यो":         "This / It",
	"त्यो":       "That",
	"हो":         "Is / Yes",
	"छ":          "Is / Has",
	"छु":         "Am",
	"थियो":       "Was",
	"थिए":        "Were",
	"राम्रो":     "Good",
	"नराम्रो":    "Bad",
	"ठूलो":       "Big",
	"सानो":       "Small",
	"पानी":       "Water",
	"खाना":       "Food",
	"घर":         "Home",
	"किताब":      "Book",
	"काम":        "Work",
	"आज":         "Today",
	"भोलि":       "Tomorrow",
	"हिजो":       "Yesterday",
	"साथी":       "Friend",
	"माया":       "Love",
	"देश":        "Country",
	"सहर":        "City",
	"संसार":      "World",
	"समय":        "Time",
	"नाम":        "Name",
	"सबै":        "All",
	"धेरै":       "Very / Many",
	"कहाँ":       "Where",
	"के":         "What",
	"किन":        "Why",
	"कसरी":       "How",
	"को":         "Who",
	"छिटो":       "Fast",
	"नयाँ":       "New",
	"पुरानो":     "Old",
	"सुरक्षा":    "Security",
	"गोपनीयता":   "Privacy",
	"विद्यालय":   "School",
	"विश्वविद्यालय": "University",
	"खुसी":       "Happy",
	"दुःखी":      "Sad",
	"सुन्दर":     "Beautiful",
	"र":          "and",
	"तर":         "but",
	"किनभने":     "because",
	"यहाँ":       "here",
	"त्यहाँ":     "there",
}

func translateTextDynamic(input, src, tgt string) string {
	cleanInput := strings.TrimSpace(input)
	if cleanInput == "" {
		return ""
	}

	// English to Nepali
	if (src == "en" || src == "auto") && tgt == "ne" {
		return translateEnToNe(cleanInput)
	}

	// Nepali to English
	if (src == "ne" || src == "auto") && (tgt == "en" || tgt == "auto") {
		return translateNeToEn(cleanInput)
	}

	// English to Spanish
	if tgt == "es" {
		return translateSimple(cleanInput, map[string]string{
			"hello": "hola", "welcome": "bienvenido", "how are you": "cómo estás",
			"good": "bueno", "thank you": "gracias", "friend": "amigo", "today": "hoy",
			"world": "mundo", "system": "sistema", "privacy": "privacidad",
			"computer": "computadora", "science": "ciencia", "student": "estudiante",
		}, "es")
	}

	// English to Hindi
	if tgt == "hi" {
		return translateSimple(cleanInput, map[string]string{
			"hello": "नमस्ते", "welcome": "स्वागत है", "how are you": "आप कैसे हैं?",
			"good": "अच्छा", "thank you": "धन्यवाद", "friend": "दोस्त", "today": "आज",
			"world": "दुनिया", "system": "सिस्टम", "privacy": "गोपनीयता",
			"computer": "कंप्यूटर", "science": "विज्ञान", "student": "छात्र",
		}, "hi")
	}

	// English to French
	if tgt == "fr" {
		return translateSimple(cleanInput, map[string]string{
			"hello": "bonjour", "welcome": "bienvenue", "how are you": "comment allez-vous",
			"good": "bon", "thank you": "merci", "friend": "ami", "today": "aujourd'hui",
			"world": "monde", "system": "système", "privacy": "confidentialité",
		}, "fr")
	}

	return fmt.Sprintf("[%s → %s]: %s", strings.ToUpper(src), strings.ToUpper(tgt), cleanInput)
}

func translateEnToNe(input string) string {
	lowerInput := strings.ToLower(input)

	// Check direct full phrase matches
	for p, trans := range enToNePhrases {
		if lowerInput == p || lowerInput == p+"." || lowerInput == p+"!" || lowerInput == p+"?" {
			return trans
		}
	}

	lines := strings.Split(input, "\n")
	var translatedLines []string

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			translatedLines = append(translatedLines, "")
			continue
		}

		// Preserve subtitle headers and cues
		if strings.HasPrefix(trimmed, "WEBVTT") || strings.Contains(trimmed, "-->") || isNumeric(trimmed) {
			translatedLines = append(translatedLines, line)
			continue
		}

		// Handle bracketed timestamp cues like [00:01 - 00:03] text
		prefixTime := ""
		contentToTranslate := line
		if strings.HasPrefix(trimmed, "[") && strings.Contains(trimmed, "]") {
			closeIdx := strings.Index(trimmed, "]")
			prefixTime = trimmed[:closeIdx+1] + " "
			contentToTranslate = strings.TrimSpace(trimmed[closeIdx+1:])
		}

		// Check multi-word phrase replacement in the line
		processedLine := contentToTranslate
		for p, trans := range enToNePhrases {
			lowerL := strings.ToLower(processedLine)
			if idx := strings.Index(lowerL, p); idx != -1 {
				processedLine = processedLine[:idx] + trans + processedLine[idx+len(p):]
			}
		}

		// Tokenize individual words
		words := strings.Fields(processedLine)
		var transWords []string
		for _, w := range words {
			cleanW := strings.ToLower(strings.Trim(w, ".,!?:;\"'()[]{}"))
			punctuation := ""
			if len(w) > len(cleanW) {
				punctuation = string(w[len(cleanW):])
			}

			if neWord, ok := enToNeWords[cleanW]; ok {
				transWords = append(transWords, neWord+punctuation)
			} else if nePhrase, ok := enToNePhrases[cleanW]; ok {
				transWords = append(transWords, nePhrase+punctuation)
			} else {
				transWords = append(transWords, w)
			}
		}

		translatedLines = append(translatedLines, prefixTime+strings.Join(transWords, " "))
	}

	return strings.Join(translatedLines, "\n")
}

func translateNeToEn(input string) string {
	lines := strings.Split(input, "\n")
	var translatedLines []string

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			translatedLines = append(translatedLines, "")
			continue
		}

		if strings.HasPrefix(trimmed, "WEBVTT") || strings.Contains(trimmed, "-->") || isNumeric(trimmed) {
			translatedLines = append(translatedLines, line)
			continue
		}

		prefixTime := ""
		contentToTranslate := line
		if strings.HasPrefix(trimmed, "[") && strings.Contains(trimmed, "]") {
			closeIdx := strings.Index(trimmed, "]")
			prefixTime = trimmed[:closeIdx+1] + " "
			contentToTranslate = strings.TrimSpace(trimmed[closeIdx+1:])
		}

		processedLine := contentToTranslate
		for p, trans := range enToNePhrases {
			if strings.Contains(processedLine, trans) {
				processedLine = strings.ReplaceAll(processedLine, trans, p)
			}
		}

		words := strings.Fields(processedLine)
		var resWords []string
		for _, w := range words {
			cleanW := strings.Trim(w, ".,!?:;|।\"'()[]{}")
			if enWord, ok := neToEnWords[cleanW]; ok {
				resWords = append(resWords, enWord)
			} else {
				resWords = append(resWords, w)
			}
		}

		translatedLines = append(translatedLines, prefixTime+strings.Join(resWords, " "))
	}

	return strings.Join(translatedLines, "\n")
}

func translateSimple(input string, dict map[string]string, lang string) string {
	lines := strings.Split(input, "\n")
	var translatedLines []string

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			translatedLines = append(translatedLines, "")
			continue
		}

		if strings.HasPrefix(trimmed, "WEBVTT") || strings.Contains(trimmed, "-->") || isNumeric(trimmed) {
			translatedLines = append(translatedLines, line)
			continue
		}

		prefixTime := ""
		contentToTranslate := line
		if strings.HasPrefix(trimmed, "[") && strings.Contains(trimmed, "]") {
			closeIdx := strings.Index(trimmed, "]")
			prefixTime = trimmed[:closeIdx+1] + " "
			contentToTranslate = strings.TrimSpace(trimmed[closeIdx+1:])
		}

		lower := strings.ToLower(contentToTranslate)
		for k, v := range dict {
			if strings.Contains(lower, k) {
				lower = strings.ReplaceAll(lower, k, v)
			}
		}

		translatedLines = append(translatedLines, prefixTime+lower)
	}

	return strings.Join(translatedLines, "\n")
}

func isNumeric(s string) bool {
	_, err := strconv.Atoi(s)
	return err == nil
}
