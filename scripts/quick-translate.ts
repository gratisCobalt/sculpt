/**
 * Quick Translation Script
 * 
 * Translates the existing 125 exercises to German.
 * This is a quick solution - full import can be done later with import-exercises.ts
 */

import pg from 'pg'
// @ts-expect-error - ESM import without types
import { translate } from '@vitalets/google-translate-api'

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'sculpt',
  user: 'sculpt',
  password: 'sculpt_dev_2026',
})

async function translateText(text: string, retries = 3): Promise<string> {
  if (!text || text.trim() === '') return ''
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await translate(text, { to: 'de' })
      return result.text
    } catch {
      if (attempt === retries) {
        console.error(`  ⚠️ Translation failed, using original`)
        return text
      }
      await new Promise(r => setTimeout(r, 1000 * attempt))
    }
  }
  return text
}

async function main() {
  console.log('🌐 Quick Translation: Translating existing exercises to German')
  console.log('='.repeat(55))
  
  const client = await pool.connect()
  
  try {
    // Step 1: Translate exercise names and overviews
    const exercises = await client.query(`
      SELECT id, name, overview 
      FROM exercise 
      WHERE name_de IS NULL OR name_de = ''
      ORDER BY id
    `)
    
    console.log(`\n📊 Found ${exercises.rows.length} exercises to translate\n`)
    
    let translated = 0
    
    for (let i = 0; i < exercises.rows.length; i++) {
      const ex = exercises.rows[i]
      console.log(`[${i + 1}/${exercises.rows.length}] ${ex.name.substring(0, 40)}...`)
      
      try {
        const nameDe = await translateText(ex.name)
        await new Promise(r => setTimeout(r, 500))
        
        let overviewDe = null
        if (ex.overview) {
          overviewDe = await translateText(ex.overview)
          await new Promise(r => setTimeout(r, 500))
        }
        
        await client.query(`
          UPDATE exercise 
          SET name_de = $1, overview_de = $2
          WHERE id = $3
        `, [nameDe, overviewDe, ex.id])
        
        console.log(`  ✅ ${nameDe.substring(0, 40)}...`)
        translated++
        
      } catch {
        console.error(`  ❌ Failed`)
      }
      
      await new Promise(r => setTimeout(r, 300))
    }
    
    // Step 2: Translate instructions
    console.log('\n📝 Translating instructions...\n')
    
    const instructions = await client.query(`
      SELECT id, instruction_text 
      FROM exercise_instruction 
      WHERE instruction_text_de IS NULL
    `)
    
    console.log(`Found ${instructions.rows.length} instructions`)
    
    for (let i = 0; i < instructions.rows.length; i++) {
      const instr = instructions.rows[i]
      
      if ((i + 1) % 50 === 0) {
        console.log(`  Progress: ${i + 1}/${instructions.rows.length}`)
      }
      
      try {
        const textDe = await translateText(instr.instruction_text)
        await client.query(`
          UPDATE exercise_instruction 
          SET instruction_text_de = $1
          WHERE id = $2
        `, [textDe, instr.id])
        await new Promise(r => setTimeout(r, 500))
      } catch {
        // Continue
      }
    }

    // Step 3: Translate tips
    console.log('\n💡 Translating tips...\n')
    
    const tips = await client.query(`
      SELECT id, tip_text 
      FROM exercise_tip 
      WHERE tip_text_de IS NULL
    `)
    
    console.log(`Found ${tips.rows.length} tips`)
    
    for (let i = 0; i < tips.rows.length; i++) {
      const tip = tips.rows[i]
      
      if ((i + 1) % 50 === 0) {
        console.log(`  Progress: ${i + 1}/${tips.rows.length}`)
      }
      
      try {
        const textDe = await translateText(tip.tip_text)
        await client.query(`
          UPDATE exercise_tip 
          SET tip_text_de = $1
          WHERE id = $2
        `, [textDe, tip.id])
        await new Promise(r => setTimeout(r, 500))
      } catch {
        // Continue
      }
    }

    // Final stats
    console.log('\n' + '='.repeat(55))
    console.log('📊 TRANSLATION COMPLETE')
    console.log('='.repeat(55))
    
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(name_de) as with_translation
      FROM exercise
    `)
    
    console.log(`✅ Exercises translated: ${translated}`)
    console.log(`📦 Total exercises: ${stats.rows[0].total}`)
    console.log(`🌐 With German translation: ${stats.rows[0].with_translation}`)
    
  } finally {
    client.release()
    await pool.end()
  }
  
  console.log('\n🎉 Done!')
}

main().catch(console.error)
