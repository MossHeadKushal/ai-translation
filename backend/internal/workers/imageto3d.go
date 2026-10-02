package workers

import (
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"ai-toolbox/internal/config"
	"ai-toolbox/internal/jobs"
)

type ImageTo3DWorker struct {
	config *config.Config
}

func NewImageTo3DWorker(cfg *config.Config) *ImageTo3DWorker {
	return &ImageTo3DWorker{config: cfg}
}

func (w *ImageTo3DWorker) Process(
	ctx context.Context,
	job *jobs.Job,
	inputPath string,
	cfg map[string]any,
	onProgress ProgressCallback,
) (string, []byte, any, error) {
	outputFormat := "glb"
	if fmtVal, ok := cfg["outputFormat"].(string); ok && fmtVal != "" {
		outputFormat = strings.ToLower(fmtVal)
	}

	geometryDetail := "medium"
	if gdVal, ok := cfg["geometryDetail"].(string); ok && gdVal != "" {
		geometryDetail = gdVal
	}

	// STRICT REAL AI MODE (MOCK_AI=false)
	if !w.config.MockAI {
		if inputPath == "" {
			return "", nil, nil, fmt.Errorf("no input image was provided for 3D model generation")
		}

		cmdExe, err := exec.LookPath(w.config.ImageTo3DCommand)
		if err != nil || cmdExe == "" {
			return "", nil, nil, fmt.Errorf("Image-to-3D model is not installed or configured on this server (command '%s' was not found). Please install a local Image-to-3D model (e.g. TripoSR, Shap-E) or set MOCK_AI=true for development mode.", w.config.ImageTo3DCommand)
		}

		onProgress(20, "Executing local Image-to-3D neural reconstruction pipeline...")
		outDir := filepath.Dir(inputPath)
		args := []string{inputPath, "--output_dir", outDir, "--format", outputFormat}
		if w.config.ImageTo3DModelPath != "" {
			args = append(args, "--model_path", w.config.ImageTo3DModelPath)
		}

		cmd := exec.CommandContext(ctx, cmdExe, args...)
		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr
		if err := cmd.Run(); err != nil {
			return "", nil, nil, fmt.Errorf("local 3D model execution failed: %v, details: %s", err, stderr.String())
		}

		onProgress(85, "Reading generated 3D model container...")
		expectedFile := filepath.Join(outDir, fmt.Sprintf("model.%s", outputFormat))
		modelData, readErr := os.ReadFile(expectedFile)
		if readErr != nil {
			// Check if any matching format file was generated in outDir
			matches, _ := filepath.Glob(filepath.Join(outDir, fmt.Sprintf("*.%s", outputFormat)))
			if len(matches) > 0 {
				expectedFile = matches[0]
				modelData, _ = os.ReadFile(expectedFile)
			}
		}

		if len(modelData) == 0 {
			return "", nil, nil, fmt.Errorf("3D reconstruction completed but failed to locate generated '%s' model in output directory", outputFormat)
		}

		outFilename := filepath.Base(expectedFile)
		baseName := "mesh"
		if job != nil && job.InputFilename != "" {
			baseName = strings.TrimSuffix(job.InputFilename, filepath.Ext(job.InputFilename))
		}

		return outFilename, modelData, map[string]any{
			"format":         outputFormat,
			"vertexCount":    len(modelData) / 12,
			"textureMap":     true,
			"fileSizeBytes":  len(modelData),
			"outputFilename": outFilename,
			"sourceImage":    baseName,
		}, nil
	}

	// DEVELOPMENT / MOCK MODE (MOCK_AI=true)
	stages := []struct {
		pct   int
		stage string
		dur   time.Duration
	}{
		{15, "Validating 2D image resolution & alpha channel (Mock)", 350 * time.Millisecond},
		{35, "Estimating monocular depth map & surface normals (Mock)", 500 * time.Millisecond},
		{60, "Marching cubes isosurface geometry & vertex generation (Mock)", 600 * time.Millisecond},
		{80, "Generating UV texture coordinates & diffuse projection (Mock)", 450 * time.Millisecond},
		{95, "Compiling and packaging target 3D container (Mock)", 300 * time.Millisecond},
	}

	for _, s := range stages {
		select {
		case <-ctx.Done():
			return "", nil, nil, ctx.Err()
		case <-time.After(s.dur):
			onProgress(s.pct, s.stage)
		}
	}

	var imgBytes []byte
	if inputPath != "" {
		imgBytes, _ = os.ReadFile(inputPath)
	}

	var outputData []byte
	var outFilename string

	switch outputFormat {
	case "obj":
		outFilename = "model_generated.obj"
		outputData = generateDynamicOBJ(imgBytes, geometryDetail)
	case "stl":
		outFilename = "model_generated.stl"
		outputData = generateDynamicSTL(imgBytes)
	default: // glb
		outputFormat = "glb"
		outFilename = "model_generated.glb"
		outputData = generateDynamicGLB(imgBytes, geometryDetail)
	}

	baseName := "mesh"
	if job != nil && job.InputFilename != "" {
		baseName = strings.TrimSuffix(job.InputFilename, filepath.Ext(job.InputFilename))
	} else if inputPath != "" {
		baseName = strings.TrimSuffix(filepath.Base(inputPath), filepath.Ext(inputPath))
	}

	result := map[string]any{
		"format":         outputFormat,
		"vertexCount":    len(outputData) / 12,
		"textureMap":     true,
		"fileSizeBytes":  len(outputData),
		"outputFilename": outFilename,
		"sourceImage":    baseName,
	}

	return outFilename, outputData, result, nil
}

func generateDynamicGLB(imgBytes []byte, detail string) []byte {
	gridSize := 16
	if detail == "high" {
		gridSize = 24
	} else if detail == "low" {
		gridSize = 10
	}

	var positions []float32
	var normals []float32
	var indices []uint16

	seed := 0.5
	if len(imgBytes) > 0 {
		for i := 0; i < len(imgBytes) && i < 100; i++ {
			seed += float64(imgBytes[i]) / 2550.0
		}
	}

	for z := 0; z < gridSize; z++ {
		for x := 0; x < gridSize; x++ {
			posX := float32(x)/float32(gridSize-1)*2.4 - 1.2
			posZ := float32(z)/float32(gridSize-1)*2.4 - 1.2

			distFromCenter := math.Sqrt(float64(posX*posX + posZ*posZ))
			factor := math.Cos(distFromCenter * 3.14159 * seed)
			if len(imgBytes) > 0 {
				byteVal := float64(imgBytes[(z*gridSize+x)%len(imgBytes)]) / 255.0
				factor = factor*0.7 + byteVal*0.5
			}
			posY := float32(factor * 0.4)

			positions = append(positions, posX, posY, posZ)
			normals = append(normals, 0.0, 1.0, 0.0)
		}
	}

	for z := 0; z < gridSize-1; z++ {
		for x := 0; x < gridSize-1; x++ {
			i0 := uint16(z*gridSize + x)
			i1 := uint16(z*gridSize + (x + 1))
			i2 := uint16((z+1)*gridSize + x)
			i3 := uint16((z+1)*gridSize + (x + 1))

			indices = append(indices, i0, i2, i1)
			indices = append(indices, i1, i2, i3)
		}
	}

	var binBuffer bytes.Buffer
	for _, idx := range indices {
		_ = binary.Write(&binBuffer, binary.LittleEndian, idx)
	}
	indicesByteLength := binBuffer.Len()

	for _, pos := range positions {
		_ = binary.Write(&binBuffer, binary.LittleEndian, pos)
	}
	positionsByteLength := len(positions) * 4

	for binBuffer.Len()%4 != 0 {
		binBuffer.WriteByte(0x00)
	}
	totalBinLength := binBuffer.Len()

	gltfJSON := map[string]any{
		"asset": map[string]string{
			"version":   "2.0",
			"generator": "AI Toolbox Procedural 3D Mesh Engine",
		},
		"scene": 0,
		"scenes": []map[string]any{
			{"nodes": []int{0}},
		},
		"nodes": []map[string]any{
			{"mesh": 0, "name": "AI_Generated_Relief_Mesh"},
		},
		"meshes": []map[string]any{
			{
				"name": "ImageReliefGeometry",
				"primitives": []map[string]any{
					{
						"attributes": map[string]int{
							"POSITION": 1,
						},
						"indices": 0,
					},
				},
			},
		},
		"buffers": []map[string]any{
			{
				"byteLength": totalBinLength,
			},
		},
		"bufferViews": []map[string]any{
			{
				"buffer":     0,
				"byteOffset": 0,
				"byteLength": indicesByteLength,
				"target":     34963,
			},
			{
				"buffer":     0,
				"byteOffset": indicesByteLength,
				"byteLength": positionsByteLength,
				"target":     34962,
			},
		},
		"accessors": []map[string]any{
			{
				"bufferView":    0,
				"byteOffset":    0,
				"componentType": 5123,
				"count":         len(indices),
				"type":          "SCALAR",
			},
			{
				"bufferView":    1,
				"byteOffset":    0,
				"componentType": 5126,
				"count":         len(positions) / 3,
				"type":          "VEC3",
				"max":           []float32{1.5, 1.5, 1.5},
				"min":           []float32{-1.5, -1.5, -1.5},
			},
		},
	}

	jsonBytes, _ := json.Marshal(gltfJSON)
	for len(jsonBytes)%4 != 0 {
		jsonBytes = append(jsonBytes, 0x20)
	}

	var glb bytes.Buffer
	glb.WriteString("glTF")
	_ = binary.Write(&glb, binary.LittleEndian, uint32(2))
	totalLength := uint32(12 + 8 + len(jsonBytes) + 8 + binBuffer.Len())
	_ = binary.Write(&glb, binary.LittleEndian, totalLength)

	_ = binary.Write(&glb, binary.LittleEndian, uint32(len(jsonBytes)))
	_ = binary.Write(&glb, binary.LittleEndian, uint32(0x4E4F534A))
	glb.Write(jsonBytes)

	_ = binary.Write(&glb, binary.LittleEndian, uint32(binBuffer.Len()))
	_ = binary.Write(&glb, binary.LittleEndian, uint32(0x004E4942))
	glb.Write(binBuffer.Bytes())

	return glb.Bytes()
}

func generateDynamicOBJ(imgBytes []byte, detail string) []byte {
	var sb strings.Builder
	sb.WriteString("# AI Toolbox Procedural 3D Mesh Generator\n")
	sb.WriteString("# Object: Dynamic Heightmap Mesh\n")

	gridSize := 12
	if detail == "high" {
		gridSize = 18
	}

	for z := 0; z < gridSize; z++ {
		for x := 0; x < gridSize; x++ {
			posX := float32(x)/float32(gridSize-1)*2.0 - 1.0
			posZ := float32(z)/float32(gridSize-1)*2.0 - 1.0
			posY := float32(math.Sin(float64(posX*2.0))*math.Cos(float64(posZ*2.0))) * 0.3
			sb.WriteString(fmt.Sprintf("v %.4f %.4f %.4f\n", posX, posY, posZ))
		}
	}

	for z := 0; z < gridSize-1; z++ {
		for x := 0; x < gridSize-1; x++ {
			i0 := z*gridSize + x + 1
			i1 := z*gridSize + (x + 1) + 1
			i2 := (z+1)*gridSize + x + 1
			i3 := (z+1)*gridSize + (x + 1) + 1
			sb.WriteString(fmt.Sprintf("f %d %d %d\n", i0, i2, i1))
			sb.WriteString(fmt.Sprintf("f %d %d %d\n", i1, i2, i3))
		}
	}

	return []byte(sb.String())
}

func generateDynamicSTL(imgBytes []byte) []byte {
	return []byte("solid AI_Generated_Relief\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid AI_Generated_Relief")
}
