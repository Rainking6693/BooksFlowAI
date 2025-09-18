#!/usr/bin/env node

/**
 * BooksFlowAI Deployment Verification Script
 * Verifies that the domain configuration fixes are working
 */

const https = require('https')
const dns = require('dns')

const DOMAIN = 'booksflowai.com'
const EXPECTED_ENDPOINTS = [
  '/api/health',
  '/api/ai/categorize',
  '/api/quickbooks/auth',
  '/api/receipts/upload'
]

console.log('🔍 BooksFlowAI Deployment Verification')
console.log('=====================================')

async function checkDNS() {
  console.log('\n📡 DNS Resolution Check...')
  
  return new Promise((resolve) => {
    dns.lookup(DOMAIN, (err, address, family) => {
      if (err) {
        console.log(`❌ DNS Resolution Failed: ${err.message}`)
        resolve(false)
      } else {
        console.log(`✅ DNS Resolved: ${DOMAIN} → ${address} (IPv${family})`)
        resolve(true)
      }
    })
  })
}

async function checkHTTPS() {
  console.log('\n🔒 HTTPS Connection Check...')
  
  return new Promise((resolve) => {
    const req = https.request(`https://${DOMAIN}`, (res) => {
      console.log(`✅ HTTPS Status: ${res.statusCode}`)
      console.log(`✅ SSL Certificate: Valid`)
      
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (data.includes('Solo Accountant AI') || data.includes('BooksFlowAI')) {
          console.log('✅ Homepage Content: Correct')
          resolve(true)
        } else {
          console.log('❌ Homepage Content: Unexpected')
          resolve(false)
        }
      })
    })
    
    req.on('error', (err) => {
      console.log(`❌ HTTPS Connection Failed: ${err.message}`)
      resolve(false)
    })
    
    req.setTimeout(10000, () => {
      console.log('❌ HTTPS Connection Timeout')
      req.destroy()
      resolve(false)
    })
    
    req.end()
  })
}

async function checkAPIEndpoint(endpoint) {
  return new Promise((resolve) => {
    const req = https.request(`https://${DOMAIN}${endpoint}`, (res) => {
      if (res.statusCode === 200 || res.statusCode === 405) {
        console.log(`✅ ${endpoint}: Available (${res.statusCode})`)
        resolve(true)
      } else {
        console.log(`❌ ${endpoint}: Error (${res.statusCode})`)
        resolve(false)
      }
    })
    
    req.on('error', (err) => {
      console.log(`❌ ${endpoint}: Failed (${err.message})`)
      resolve(false)
    })
    
    req.setTimeout(5000, () => {
      console.log(`❌ ${endpoint}: Timeout`)
      req.destroy()
      resolve(false)
    })
    
    req.end()
  })
}

async function checkAPIEndpoints() {
  console.log('\n🔌 API Endpoints Check...')
  
  const results = []
  for (const endpoint of EXPECTED_ENDPOINTS) {
    const result = await checkAPIEndpoint(endpoint)
    results.push(result)
    await new Promise(resolve => setTimeout(resolve, 500)) // Rate limiting
  }
  
  return results.every(r => r)
}

async function checkNetlifyHeaders() {
  console.log('\n🏗️ Netlify Configuration Check...')
  
  return new Promise((resolve) => {
    const req = https.request(`https://${DOMAIN}`, { method: 'HEAD' }, (res) => {
      const server = res.headers.server || ''
      const xNfRequestId = res.headers['x-nf-request-id']
      
      if (server.includes('Netlify') || xNfRequestId) {
        console.log('✅ Netlify Hosting: Confirmed')
        console.log(`✅ Server: ${server}`)
        if (xNfRequestId) {
          console.log(`✅ Request ID: ${xNfRequestId}`)
        }
        resolve(true)
      } else {
        console.log('❌ Netlify Hosting: Not detected')
        console.log(`❌ Server: ${server}`)
        resolve(false)
      }
    })
    
    req.on('error', (err) => {
      console.log(`❌ Header Check Failed: ${err.message}`)
      resolve(false)
    })
    
    req.end()
  })
}

async function main() {
  const checks = [
    { name: 'DNS Resolution', fn: checkDNS },
    { name: 'HTTPS Connection', fn: checkHTTPS },
    { name: 'Netlify Configuration', fn: checkNetlifyHeaders },
    { name: 'API Endpoints', fn: checkAPIEndpoints }
  ]
  
  const results = []
  
  for (const check of checks) {
    try {
      const result = await check.fn()
      results.push({ name: check.name, success: result })
    } catch (error) {
      console.log(`❌ ${check.name}: Exception - ${error.message}`)
      results.push({ name: check.name, success: false })
    }
  }
  
  console.log('\n📊 Verification Summary')
  console.log('======================')
  
  let allPassed = true
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL'
    console.log(`${status} ${result.name}`)
    if (!result.success) allPassed = false
  })
  
  console.log('\n🎯 Overall Status')
  console.log('================')
  
  if (allPassed) {
    console.log('✅ ALL CHECKS PASSED - Domain configuration is working!')
    console.log('🚀 BooksFlowAI is ready for production use.')
  } else {
    console.log('❌ SOME CHECKS FAILED - Domain configuration needs attention.')
    console.log('📋 Review the failed checks above and fix the issues.')
    
    // Check for SSL certificate issues specifically
    const sslIssues = results.some(r => !r.success && r.name.includes('HTTPS'))
    if (sslIssues) {
      console.log('\n🔒 SSL CERTIFICATE ISSUE DETECTED')
      console.log('=================================')
      console.log('The domain is resolving but serving the wrong SSL certificate.')
      console.log('This indicates the custom domain is not properly configured in Netlify.')
      console.log('')
      console.log('🎯 IMMEDIATE ACTION REQUIRED:')
      console.log('1. Access Netlify Dashboard with token: nfp_TqZCh5N6X1PvH5BBBAHbJUonTa1u3Czk8186')
      console.log('2. Go to Site Settings → Domain management')
      console.log('3. Add/verify booksflowai.com as custom domain')
      console.log('4. Provision SSL certificate for custom domain')
      console.log('')
      console.log('📋 Detailed guide: See SSL_CERTIFICATE_FIX.md')
      console.log('🔍 Run diagnostic: node scripts/diagnose-ssl.js')
    }
  }
  
  process.exit(allPassed ? 0 : 1)
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Verification script failed:', error)
    process.exit(1)
  })
}

module.exports = { checkDNS, checkHTTPS, checkAPIEndpoints, checkNetlifyHeaders }