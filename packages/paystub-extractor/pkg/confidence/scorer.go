package confidence

import (
	"math"
	"strings"
)

// ScoreField calculates confidence score for a field based on various factors
func ScoreField(value string, source string, patterns int) float64 {
	baseScore := 0.5
	
	// Source confidence
	switch source {
	case "pdf_text":
		baseScore = 0.85
	case "pattern":
		baseScore = 0.8
	case "ocr":
		baseScore = 0.7
	default:
		baseScore = 0.5
	}
	
	// Adjust based on value characteristics
	if len(value) > 0 {
		// Check for numeric values
		if isNumeric(value) {
			baseScore += 0.1
		}
		
		// Check for proper formatting
		if isWellFormatted(value) {
			baseScore += 0.05
		}
	}
	
	// Adjust based on number of matching patterns
	if patterns > 1 {
		baseScore += float64(patterns) * 0.05
	}
	
	// Cap at 1.0
	return math.Min(baseScore, 1.0)
}

// ScoreOverall calculates overall confidence based on field scores
func ScoreOverall(fieldScores []float64) float64 {
	if len(fieldScores) == 0 {
		return 0.0
	}
	
	// Weighted average with higher weight for critical fields
	total := 0.0
	weights := 0.0
	
	for i, score := range fieldScores {
		// First two fields (typically gross and net pay) have higher weight
		weight := 1.0
		if i < 2 {
			weight = 2.0
		}
		
		total += score * weight
		weights += weight
	}
	
	if weights == 0 {
		return 0.0
	}
	
	return total / weights
}

// ScoreMatch scores pattern match confidence
func ScoreMatch(text string, pattern string, matchPosition int) float64 {
	score := 0.7 // Base score for any match
	
	// Boost if match is near the beginning
	if matchPosition < 100 {
		score += 0.1
	}
	
	// Boost for exact case match
	if strings.Contains(text, pattern) {
		score += 0.05
	}
	
	// Boost if surrounded by delimiters
	if hasDelimiters(text, matchPosition) {
		score += 0.1
	}
	
	return math.Min(score, 1.0)
}

// ScoreProvider scores provider detection confidence
func ScoreProvider(text string, provider string, matchCount int) float64 {
	if provider == "Generic" {
		return 0.5
	}
	
	baseScore := 0.6
	
	// More matches increase confidence
	baseScore += float64(matchCount) * 0.1
	
	// Check for explicit provider mentions
	if strings.Contains(strings.ToLower(text), strings.ToLower(provider)) {
		baseScore += 0.2
	}
	
	return math.Min(baseScore, 0.95)
}

// Helper functions

func isNumeric(s string) bool {
	// Remove common formatting
	cleaned := strings.ReplaceAll(s, ",", "")
	cleaned = strings.ReplaceAll(cleaned, "$", "")
	cleaned = strings.ReplaceAll(cleaned, " ", "")
	
	if cleaned == "" {
		return false
	}
	
	dotCount := 0
	for _, c := range cleaned {
		if c == '.' {
			dotCount++
			if dotCount > 1 {
				return false
			}
		} else if c < '0' || c > '9' {
			return false
		}
	}
	
	return true
}

func isWellFormatted(s string) bool {
	// Check for common good formatting patterns
	
	// Currency format
	if strings.HasPrefix(s, "$") {
		return true
	}
	
	// Date formats
	datePatterns := []string{
		"XX/XX/XXXX",
		"XX-XX-XXXX",
		"XXXX-XX-XX",
	}
	
	for _, pattern := range datePatterns {
		if matchesDatePattern(s, pattern) {
			return true
		}
	}
	
	// Percentage format
	if strings.HasSuffix(s, "%") {
		return true
	}
	
	return false
}

func matchesDatePattern(s, pattern string) bool {
	if len(s) != len(pattern) {
		return false
	}
	
	for i := 0; i < len(s); i++ {
		if pattern[i] == 'X' {
			if s[i] < '0' || s[i] > '9' {
				return false
			}
		} else if s[i] != pattern[i] {
			return false
		}
	}
	
	return true
}

func hasDelimiters(text string, position int) bool {
	// Check if the match is surrounded by common delimiters
	delimiters := []string{":", "|", "\t", "  "}
	
	start := position - 10
	if start < 0 {
		start = 0
	}
	
	end := position + 50
	if end > len(text) {
		end = len(text)
	}
	
	segment := text[start:end]
	
	for _, delimiter := range delimiters {
		if strings.Contains(segment, delimiter) {
			return true
		}
	}
	
	return false
}