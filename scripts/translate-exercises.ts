/**
 * PHASE 2: Translate Exercises to German
 * 
 * This script translates all exercises that don't have German translations yet.
 * It runs in batches and can be resumed if interrupted.
 * 
 * Uses Google Translate API (free tier).
 */

import pg from 'pg'
// @ts-ignore
import { translate } from '@vitalets/google-translate-api'

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'sculpt',
  user: 'sculpt',
  password: 'sculpt_dev_2026',
})

// Translation with retry logic
async function translateText(text: string, retries = 3): Promise<string> {
  if (!text || text.trim() === '') return ''
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await translate(text, { to: 'de' })
      return result.text
    } catch (e: any) {
      if (attempt === retries) {
        console.error(`  ⚠️ Translation failed after ${retries} attempts, using original`)
        return text
      }
      // Wait longer between retries (exponential backoff)
      await new Promise(r => setTimeout(r, 1000 * attempt))
    }
  }
  return text
}

async function main() {
  console.log('🌐 PHASE 2: Translate Exercises to German')
  console.log('='.repeat(50))
  
  const client = await pool.connect()
  
  try {
    // Get exercises that need translation
    const untranslated = await client.query(`
      SELECT id, name, overview 
      FROM exercise 
      WHERE name_de IS NULL OR name_de = ''
      ORDER BY id
    `)
    
    console.log(`\n📊 Found ${untranslated.rows.length} exercises needing translation\n`)
    
    if (untranslated.rows.length === 0) {
      console.log('✅ All exercises already translated!')
      return
    }
    
    let translated = 0
    let failed = 0
    const startTime = Date.now()
    
    for (let i = 0; i < untranslated.rows.length; i++) {
      const exercise = untranslated.rows[i]
      
      // Progress update every 20 exercises
      if ((i + 1) % 20 === 0 || i === 0) {
        const elapsed = (Date.now() - startTime) / 1000
        const rate = (i + 1) / elapsed
        const remaining = (untranslated.rows.length - i - 1) / rate
        console.log(`[${i + 1}/${untranslated.rows.length}] (~${Math.round(remaining / 60)}min remaining)`)
      }
      
      try {
        // Translate name
        const nameDe = await translateText(exercise.name)
        await new Promise(r => setTimeout(r, 400)) // Rate limit
        
        // Translate overview if exists
        let overviewDe = null
        if (exercise.overview) {
          overviewDe = await translateText(exercise.overview)
          await new Promise(r => setTimeout(r, 400))
        }
        
        // Update exercise
        await client.query(`
          UPDATE exercise 
          SET name_de = $1, overview_de = $2
          WHERE id = $3
        `, [nameDe, overviewDe, exercise.id])
        
        translated++
        
      } catch (e) {
        console.error(`  ❌ Failed: ${exercise.name}`)
        failed++
      }
      
      // Additional rate limiting to avoid being blocked
      await new Promise(r => setTimeout(r, 300))
    }
    
    // Now translate instructions
    console.log('\n📝 Translating instructions...\n')
    
    const untranslatedInstructions = await client.query(`
      SELECT id, exercise_id, instruction_text 
      FROM exercise_instruction 
      WHERE instruction_text_de IS NULL OR instruction_text_de = ''
      ORDER BY exercise_id, step_number
    `)
    
    console.log(`Found ${untranslatedInstructions.rows.length} instructions to translate`)
    
    for (let i = 0; i < untranslatedInstructions.rows.length; i++) {
      const instr = untranslatedInstructions.rows[i]
      
      if ((i + 1) % 100 === 0) {
        console.log(`  Instructions: ${i + 1}/${untranslatedInstructions.rows.length}`)
      }
      
      try {
        const textDe = await translateText(instr.instruction_text)
        await client.query(`
          UPDATE exercise_instruction 
          SET instruction_text_de = $1
          WHERE id = $2
        `, [textDe, instr.id])
        
        await new Promise(r => setTimeout(r, 400))
      } catch (e) {
        // Continue on failure
      }
    }
    
    // Translate tips
    console.log('\n💡 Translating tips...\n')
    
    const untranslatedTips = await client.query(`
      SELECT id, tip_text 
      FROM exercise_tip 
      WHERE tip_text_de IS NULL OR tip_text_de = ''
    `)
    
    console.log(`Found ${untranslatedTips.rows.length} tips to translate`)
    
    for (let i = 0; i < untranslatedTips.rows.length; i++) {
      const tip = untranslatedTips.rows[i]
      
      if ((i + 1) % 100 === 0) {
        console.log(`  Tips: ${i + 1}/${untranslatedTips.rows.length}`)
      }
      
      try {
        const textDe = await translateText(tip.tip_text)
        await client.query(`
          UPDATE exercise_tip 
          SET tip_text_de = $1
          WHERE id = $2
        `, [textDe, tip.id])
        
        await new Promise(r => setTimeout(r, 400))
      } catch (e) {
        // Continue on failure
      }
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('📊 PHASE 2 COMPLETE')
    console.log('='.repeat(50))
    console.log(`✅ Exercises translated: ${translated}`)
    console.log(`❌ Failed: ${failed}`)
    
    // Final stats
    const translatedCount = await client.query(`
      SELECT COUNT(*) FROM exercise WHERE name_de IS NOT NULL AND name_de != ''
    `)
    const totalCount = await client.query('SELECT COUNT(*) FROM exercise')
    
    console.log(`\n📊 Final status:`)
    console.log(`   Total exercises: ${totalCount.rows[0].count}`)
    console.log(`   With German translations: ${translatedCount.rows[0].count}`)
    
  } finally {
    client.release()
    await pool.end()
  }
  
  console.log('\n🎉 Translation complete!')
}

main().catch(console.error)
