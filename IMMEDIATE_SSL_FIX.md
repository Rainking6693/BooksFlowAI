# 🚨 IMMEDIATE SSL CERTIFICATE FIX

**Issue:** booksflowai.com serving wrong SSL certificate  
**Error:** Certificate only valid for `*.netlify.app`, not `booksflowai.com`  
**Status:** DNS working ✅ | SSL broken ❌  

## 🎯 **5-MINUTE FIX**

### 1. **Access Netlify Dashboard** (1 minute)
```
🔑 Token: nfp_TqZCh5N6X1PvH5BBBAHbJUonTa1u3Czk8186
🌐 URL: https://app.netlify.com
```

### 2. **Navigate to Domain Settings** (1 minute)
```
1. Find "BooksFlowAI" site in dashboard
2. Click "Site Settings"
3. Go to "Domain management" section
```

### 3. **Add Custom Domain** (2 minutes)
```
If booksflowai.com is NOT listed:
1. Click "Add custom domain"
2. Enter: booksflowai.com
3. Click "Verify"

If booksflowai.com IS listed:
1. Check status (should be "Active")
2. Look for SSL certificate status
```

### 4. **Provision SSL Certificate** (1 minute)
```
1. Find "HTTPS" section
2. Look for SSL certificate status
3. Click "Renew certificate" or "Provision certificate"
4. Wait 5-15 minutes for provisioning
```

## 🔍 **What You Should See**

### ✅ **Success Indicators:**
- Custom domain shows "Active" status
- SSL certificate shows "Active" or "Provisioning"
- No error messages in domain settings

### ❌ **Problem Indicators:**
- Domain not listed in custom domains
- SSL certificate shows "Failed" or "Not provisioned"
- DNS configuration warnings

## ⏱️ **Timeline**
- **Setup:** 5 minutes
- **SSL Provisioning:** 5-15 minutes  
- **Global Propagation:** 1-24 hours

## 🧪 **Test After Fix**
```bash
# Wait 15 minutes, then run:
node scripts/verify-deployment.js

# Should show:
# ✅ PASS HTTPS Connection
# ✅ PASS API Endpoints
```

## 🆘 **If Still Broken**
```bash
# Run detailed diagnostic:
node scripts/diagnose-ssl.js

# Check specific SSL details:
openssl s_client -connect booksflowai.com:443 -servername booksflowai.com
```

---

**🎯 ROOT CAUSE:** Custom domain added to DNS but not configured in Netlify dashboard  
**🔧 SOLUTION:** Add custom domain and provision SSL certificate through Netlify interface  
**⏰ TIME:** 5 minutes setup + 15 minutes provisioning = 20 minutes total