package middleware

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

type RateLimiter struct {
	mu          sync.Mutex
	visitors    map[string]*visitor
	rateLimit   int           // Max requests per window
	window      time.Duration // Time window
	cleanupTick time.Duration
}

type visitor struct {
	lastSeen time.Time
	count    int
}

func NewRateLimiter(rateLimit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		visitors:    make(map[string]*visitor),
		rateLimit:   rateLimit,
		window:      window,
		cleanupTick: 3 * time.Minute,
	}

	go rl.cleanupLoop()
	return rl
}

func (rl *RateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := getIP(r)

		rl.mu.Lock()
		v, exists := rl.visitors[ip]
		now := time.Now()

		if !exists || now.Sub(v.lastSeen) > rl.window {
			rl.visitors[ip] = &visitor{lastSeen: now, count: 1}
			rl.mu.Unlock()
			next.ServeHTTP(w, r)
			return
		}

		v.count++
		if v.count > rl.rateLimit {
			rl.mu.Unlock()
			http.Error(w, `{"error": "Too many requests. Please slow down."}`, http.StatusTooManyRequests)
			return
		}

		rl.mu.Unlock()
		next.ServeHTTP(w, r)
	})
}

func (rl *RateLimiter) cleanupLoop() {
	ticker := time.NewTicker(rl.cleanupTick)
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for ip, v := range rl.visitors {
			if now.Sub(v.lastSeen) > rl.window*2 {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}

func getIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	if xrip := r.Header.Get("X-Real-IP"); xrip != "" {
		return strings.TrimSpace(xrip)
	}
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}
