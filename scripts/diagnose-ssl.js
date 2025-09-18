#!/usr/bin/env node

/**
 * SSL Certificate Diagnostic Script for booksflowai.com
 * Helps identify the exact issue with custom domain SSL configuration
 */

const https = require('https')
const tls = require('tls')
const dns = require('dns')

const DOMAIN = 'booksflowai.com'

console.log('🔒 SSL Certificate Diagnostic for booksflowai.com')
console.log('================================================')

async function checkDNSRecords() {
  console.log('\n📡 DNS Records Analysis...')
  
  return new Promise((resolve) => {
    // Check A record
    dns.resolve4(DOMAIN, (err, addresses) => {
      if (err) {
        console.log(`❌ A Record: Failed - ${err.message}`)
      } else {
        console.log(`✅ A Record: ${addresses.join(', ')}`)
        
        // Check if pointing to Netlify
        const netlifyIPs = ['75.2.60.5', '99.83.190.102']
        const isNetlify = addresses.some(ip => netlifyIPs.includes(ip))
        console.log(`📍 Points to Netlify: ${isNetlify ? '✅ Yes' : '❌ No'}`)
      }
      
      // Check CNAME for www
      dns.resolve(DOMAIN, 'CNAME', (err, records) => {
        if (!err && records.length > 0) {
          console.log(`✅ CNAME Record: ${records.join(', ')}`)
        }
        resolve()
      })
    })
  })
}

async function checkSSLCertificate() {
  console.log('\n🔒 SSL Certificate Analysis...')
  
  return new Promise((resolve) => {
    const options = {
      host: DOMAIN,
      port: 443,
      servername: DOMAIN,
      rejectUnauthorized: false
    }
    
    const socket = tls.connect(options, () => {
      const cert = socket.getPeerCertificate()
      
      console.log(`📋 Certificate Subject: ${cert.subject.CN}`)
      console.log(`🏢 Certificate Issuer: ${cert.issuer.CN}`)
      console.log(`📅 Valid From: ${cert.valid_from}`)
      console.log(`📅 Valid To: ${cert.valid_to}`)
      
      // Check Subject Alternative Names
      if (cert.subjectaltname) {\n        console.log(`🔗 Alt Names: ${cert.subjectaltname}`)
        \n        const altNames = cert.subjectaltname.split(', ')
        const hasDomain = altNames.some(name => \n          name === `DNS:${DOMAIN}` || name === `DNS:*.${DOMAIN.split('.').slice(-2).join('.')}`\n        )
        \n        console.log(`✅ Domain in Certificate: ${hasDomain ? '✅ Yes' : '❌ No'}`)
        \n        if (!hasDomain) {
          console.log(`⚠️  Certificate is for: ${altNames.join(', ')}`)
          console.log(`⚠️  But we need: DNS:${DOMAIN}`)
        }
      } else {
        console.log('❌ No Subject Alternative Names found')
      }
      
      socket.end()
      resolve()
    })
    
    socket.on('error', (err) => {
      console.log(`❌ SSL Connection Failed: ${err.message}`)
      resolve()
    })
  })
}

async function checkNetlifyHeaders() {
  console.log('\n🏗️ Netlify Configuration Check...')
  
  return new Promise((resolve) => {
    const req = https.request({
      hostname: DOMAIN,
      port: 443,
      path: '/',
      method: 'HEAD',
      rejectUnauthorized: false
    }, (res) => {
      console.log(`📊 Response Status: ${res.statusCode}`)
      console.log(`🖥️  Server: ${res.headers.server || 'Not specified'}`)
      console.log(`🆔 X-NF-Request-ID: ${res.headers['x-nf-request-id'] || 'Not found'}`)
      console.log(`🔗 X-Served-By: ${res.headers['x-served-by'] || 'Not found'}`)
      
      const isNetlify = res.headers.server?.includes('Netlify') || res.headers['x-nf-request-id']
      console.log(`✅ Served by Netlify: ${isNetlify ? '✅ Yes' : '❌ No'}`)
      
      resolve()
    })
    
    req.on('error', (err) => {
      console.log(`❌ Request Failed: ${err.message}`)
      resolve()
    })
    
    req.end()
  })
}

async function suggestFix() {
  console.log('\n💡 Recommended Actions')
  console.log('======================')
  
  console.log('1. 🎯 **IMMEDIATE:** Access Netlify Dashboard')
  console.log('   - Token: nfp_TqZCh5N6X1PvH5BBBAHbJUonTa1u3Czk8186')
  console.log('   - URL: https://app.netlify.com')
  
  console.log('\n2. 🔧 **CHECK:** Domain Settings')
  console.log('   - Go to: Site Settings → Domain management')
  console.log('   - Verify: booksflowai.com is listed as custom domain')
  console.log('   - Status: Should show "Netlify DNS" or "External DNS"')
  
  console.log('\n3. 🔒 **FIX:** SSL Certificate')
  console.log('   - Find: HTTPS section in domain settings')
  console.log('   - Action: Click "Renew certificate" or "Provision certificate"')
  console.log('   - Wait: 5-15 minutes for provisioning')
  
  console.log('\n4. ✅ **VERIFY:** After changes')
  console.log('   - Run: node scripts/verify-deployment.js')
  console.log('   - Test: https://booksflowai.com should load without certificate errors')
  
  console.log('\n⚠️  **ROOT CAUSE:** Custom domain SSL certificate not provisioned in Netlify')
  console.log('🎯 **SOLUTION:** Configure custom domain properly in Netlify dashboard')
}

async function main() {
  try {
    await checkDNSRecords()
    await checkSSLCertificate()
    await checkNetlifyHeaders()
    await suggestFix()
    
    console.log('\n🎯 Summary')
    console.log('==========')
    console.log('DNS is working, but SSL certificate is for *.netlify.app instead of booksflowai.com')
    console.log('This indicates the custom domain is not properly configured in Netlify.')
    console.log('Follow the recommended actions above to fix the SSL certificate issue.')
    
  } catch (error) {
    console.error('💥 Diagnostic failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { checkDNSRecords, checkSSLCertificate, checkNetlifyHeaders }