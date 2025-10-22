#!/bin/bash

# UjenziPro2 Security Test Suite
# Comprehensive automated security testing framework

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TARGET_URL="${TARGET_URL:-http://localhost:8080}"
REPORT_DIR="./security-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create reports directory
mkdir -p "$REPORT_DIR"

echo -e "${BLUE}🔍 UjenziPro2 Security Test Suite${NC}"
echo -e "${BLUE}Target: $TARGET_URL${NC}"
echo -e "${BLUE}Report Directory: $REPORT_DIR${NC}"
echo -e "${BLUE}Timestamp: $TIMESTAMP${NC}"
echo ""

# Function to print section headers
print_section() {
    echo -e "\n${YELLOW}$1${NC}"
    echo "=================================="
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Dependency Vulnerability Scan
print_section "📦 Dependency Vulnerability Scan"
if command_exists npm; then
    echo "Running npm audit..."
    npm audit --json > "$REPORT_DIR/npm-audit-$TIMESTAMP.json" || true
    npm audit > "$REPORT_DIR/npm-audit-$TIMESTAMP.txt" || true
    echo -e "${GREEN}✓ NPM audit completed${NC}"
else
    echo -e "${RED}✗ NPM not found, skipping dependency scan${NC}"
fi

# 2. Static Code Analysis
print_section "🔍 Static Code Analysis"
if command_exists eslint; then
    echo "Running ESLint security analysis..."
    npx eslint src/ --ext .ts,.tsx --format json > "$REPORT_DIR/eslint-$TIMESTAMP.json" || true
    echo -e "${GREEN}✓ ESLint analysis completed${NC}"
else
    echo -e "${RED}✗ ESLint not found, skipping static analysis${NC}"
fi

# 3. OWASP ZAP Baseline Scan
print_section "🕷️ OWASP ZAP Baseline Scan"
if command_exists docker; then
    echo "Running OWASP ZAP baseline scan..."
    docker run --rm -v "$PWD/$REPORT_DIR":/zap/wrk/:rw \
        -t owasp/zap2docker-stable zap-baseline.py \
        -t "$TARGET_URL" \
        -J "zap-baseline-$TIMESTAMP.json" \
        -r "zap-baseline-$TIMESTAMP.html" || true
    echo -e "${GREEN}✓ OWASP ZAP baseline scan completed${NC}"
else
    echo -e "${RED}✗ Docker not found, skipping OWASP ZAP scan${NC}"
fi

# 4. Nuclei Vulnerability Scan
print_section "⚡ Nuclei Vulnerability Scan"
if command_exists nuclei; then
    echo "Running Nuclei vulnerability scan..."
    nuclei -u "$TARGET_URL" \
        -t cves/ -t vulnerabilities/ -t security-misconfiguration/ \
        -json -o "$REPORT_DIR/nuclei-$TIMESTAMP.json" || true
    echo -e "${GREEN}✓ Nuclei scan completed${NC}"
else
    echo -e "${RED}✗ Nuclei not found, skipping vulnerability scan${NC}"
fi

# 5. SSL/TLS Security Test
print_section "🔒 SSL/TLS Security Test"
if command_exists testssl.sh; then
    echo "Running SSL/TLS security test..."
    testssl.sh --jsonfile "$REPORT_DIR/testssl-$TIMESTAMP.json" "$TARGET_URL" > "$REPORT_DIR/testssl-$TIMESTAMP.txt" || true
    echo -e "${GREEN}✓ SSL/TLS test completed${NC}"
elif command_exists nmap; then
    echo "Running Nmap SSL enumeration..."
    nmap --script ssl-enum-ciphers -p 443 "${TARGET_URL#https://}" > "$REPORT_DIR/nmap-ssl-$TIMESTAMP.txt" || true
    echo -e "${GREEN}✓ Nmap SSL test completed${NC}"
else
    echo -e "${RED}✗ SSL testing tools not found, skipping SSL test${NC}"
fi

# 6. HTTP Security Headers Check
print_section "🛡️ HTTP Security Headers Check"
cat > "$REPORT_DIR/security-headers-test-$TIMESTAMP.sh" << 'EOF'
#!/bin/bash
URL="$1"
echo "Testing security headers for: $URL"
echo ""

# Function to check header
check_header() {
    local header="$1"
    local expected="$2"
    local response=$(curl -s -I "$URL" | grep -i "$header:" || echo "MISSING")
    
    if [[ "$response" == "MISSING" ]]; then
        echo "❌ $header: MISSING"
    else
        echo "✅ $header: $response"
    fi
}

# Check critical security headers
check_header "X-Frame-Options" "DENY"
check_header "X-Content-Type-Options" "nosniff"
check_header "X-XSS-Protection" "1; mode=block"
check_header "Strict-Transport-Security" "max-age="
check_header "Content-Security-Policy" "default-src"
check_header "Referrer-Policy" "strict-origin"
check_header "Permissions-Policy" "camera="

echo ""
echo "Complete headers:"
curl -s -I "$URL"
EOF

chmod +x "$REPORT_DIR/security-headers-test-$TIMESTAMP.sh"
bash "$REPORT_DIR/security-headers-test-$TIMESTAMP.sh" "$TARGET_URL" > "$REPORT_DIR/security-headers-$TIMESTAMP.txt"
echo -e "${GREEN}✓ Security headers test completed${NC}"

# 7. Custom Security Tests
print_section "🧪 Custom Security Tests"
if [ -f "package.json" ] && grep -q "test:security" package.json; then
    echo "Running custom security tests..."
    npm run test:security > "$REPORT_DIR/custom-tests-$TIMESTAMP.txt" 2>&1 || true
    echo -e "${GREEN}✓ Custom security tests completed${NC}"
else
    echo -e "${YELLOW}⚠ No custom security tests found${NC}"
fi

# 8. Generate Summary Report
print_section "📊 Generating Summary Report"
cat > "$REPORT_DIR/security-summary-$TIMESTAMP.md" << EOF
# UjenziPro2 Security Test Summary

**Test Date**: $(date)  
**Target URL**: $TARGET_URL  
**Test Suite Version**: 1.0

## Test Results Overview

### 1. Dependency Vulnerabilities
$(if [ -f "$REPORT_DIR/npm-audit-$TIMESTAMP.json" ]; then
    echo "✅ NPM audit completed - Check npm-audit-$TIMESTAMP.json for details"
else
    echo "❌ NPM audit not performed"
fi)

### 2. Static Code Analysis
$(if [ -f "$REPORT_DIR/eslint-$TIMESTAMP.json" ]; then
    echo "✅ ESLint analysis completed - Check eslint-$TIMESTAMP.json for details"
else
    echo "❌ ESLint analysis not performed"
fi)

### 3. OWASP ZAP Baseline Scan
$(if [ -f "$REPORT_DIR/zap-baseline-$TIMESTAMP.json" ]; then
    echo "✅ OWASP ZAP scan completed - Check zap-baseline-$TIMESTAMP.html for details"
else
    echo "❌ OWASP ZAP scan not performed"
fi)

### 4. Nuclei Vulnerability Scan
$(if [ -f "$REPORT_DIR/nuclei-$TIMESTAMP.json" ]; then
    echo "✅ Nuclei scan completed - Check nuclei-$TIMESTAMP.json for details"
else
    echo "❌ Nuclei scan not performed"
fi)

### 5. SSL/TLS Security Test
$(if [ -f "$REPORT_DIR/testssl-$TIMESTAMP.json" ]; then
    echo "✅ SSL/TLS test completed - Check testssl-$TIMESTAMP.txt for details"
else
    echo "❌ SSL/TLS test not performed"
fi)

### 6. Security Headers Check
$(if [ -f "$REPORT_DIR/security-headers-$TIMESTAMP.txt" ]; then
    echo "✅ Security headers test completed - Check security-headers-$TIMESTAMP.txt for details"
else
    echo "❌ Security headers test not performed"
fi)

## Recommendations

1. **Review all generated reports** in the $REPORT_DIR directory
2. **Address any critical or high-severity vulnerabilities** immediately
3. **Update dependencies** with known vulnerabilities
4. **Implement missing security headers** if any were identified
5. **Schedule regular security testing** using this test suite

## Next Steps

- [ ] Review detailed reports
- [ ] Create remediation tickets for identified issues
- [ ] Update security documentation
- [ ] Schedule next security test

---
*Generated by UjenziPro2 Security Test Suite*
EOF

echo -e "${GREEN}✓ Summary report generated: security-summary-$TIMESTAMP.md${NC}"

# 9. Final Summary
print_section "📋 Test Suite Complete"
echo -e "${GREEN}✅ Security test suite completed successfully${NC}"
echo -e "${BLUE}📁 Reports saved to: $REPORT_DIR${NC}"
echo ""
echo "Generated files:"
ls -la "$REPORT_DIR"/*"$TIMESTAMP"* 2>/dev/null || echo "No files generated"

echo ""
echo -e "${YELLOW}🔍 Next Steps:${NC}"
echo "1. Review the summary report: $REPORT_DIR/security-summary-$TIMESTAMP.md"
echo "2. Check individual test reports for detailed findings"
echo "3. Address any critical or high-severity issues"
echo "4. Update your security documentation"

# Check for critical issues
if [ -f "$REPORT_DIR/npm-audit-$TIMESTAMP.json" ]; then
    CRITICAL_COUNT=$(jq '.metadata.vulnerabilities.critical // 0' "$REPORT_DIR/npm-audit-$TIMESTAMP.json" 2>/dev/null || echo "0")
    if [ "$CRITICAL_COUNT" -gt 0 ]; then
        echo -e "\n${RED}⚠️  WARNING: $CRITICAL_COUNT critical vulnerabilities found in dependencies!${NC}"
    fi
fi

echo -e "\n${GREEN}Security testing completed! 🛡️${NC}"

