/**
 * Apply manual German translations 
 * Uses predefined translation mappings when APIs are rate-limited
 */

import pg from 'pg'

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'sculpt',
  user: 'sculpt',
  password: 'sculpt_dev_2026',
})

// Manual translation mappings for common exercises
const translations: Record<string, string> = {
  // Compound movements
  'bench press': 'Bankdrücken',
  'squat': 'Kniebeuge',
  'deadlift': 'Kreuzheben',
  'pull up': 'Klimmzug',
  'pullup': 'Klimmzug',
  'push up': 'Liegestütze',
  'pushup': 'Liegestütze',
  'dip': 'Dips',
  'lunge': 'Ausfallschritt',
  'row': 'Rudern',
  
  // Chest
  'incline bench press': 'Schrägbankdrücken',
  'decline bench press': 'Negativbankdrücken',
  'chest fly': 'Fliegende',
  'chest flye': 'Fliegende',
  'cable crossover': 'Kabelzugübers Kreuz',
  'diamond press': 'Diamant-Drücken',
  'triceps press': 'Trizepsdrücken',
  
  // Back
  'lat pulldown': 'Latzug',
  'barbell row': 'Langhantelrudern',
  'cable row': 'Kabelrudern',
  'seated row': 'Sitzendes Rudern',
  'hyperextension': 'Hyperextension',
  'superman': 'Rückenstrecker',
  
  // Shoulders
  'shoulder press': 'Schulterdrücken',
  'military press': 'Schulterdrücken',
  'overhead press': 'Überkopfdrücken',
  'arnold press': 'Arnold Press',
  'lateral raise': 'Seitheben',
  'front raise': 'Frontheben',
  'rear delt': 'Hintere Schulter',
  'face pull': 'Face Pull',
  'shrug': 'Schulterheben',
  'upright row': 'Aufrechtes Rudern',
  
  // Arms
  'bicep curl': 'Bizeps-Curl',
  'biceps curl': 'Bizeps-Curl',
  'hammer curl': 'Hammer-Curl',
  'concentration curl': 'Konzentrations-Curl',
  'preacher curl': 'Scott-Curl',
  'tricep extension': 'Trizeps-Extension',
  'triceps extension': 'Trizeps-Extension',
  'cable pushdown': 'Kabeldrücken',
  'skull crusher': 'French Press',
  'kickback': 'Trizeps-Kickback',
  'wrist curl': 'Handgelenk-Curl',
  
  // Legs
  'leg press': 'Beinpresse',
  'leg extension': 'Beinstrecker',
  'leg curl': 'Beinbeuger',
  'calf raise': 'Wadenheben',
  'bulgarian split squat': 'Bulgarische Kniebeuge',
  'goblet squat': 'Goblet-Kniebeuge',
  'sumo squat': 'Sumo-Kniebeuge',
  'sissy squat': 'Sissy-Kniebeuge',
  'split squat': 'Split-Kniebeuge',
  'jump squat': 'Sprung-Kniebeuge',
  'squat thrust': 'Kniebeugen-Stoß',
  'romanian deadlift': 'Rumänisches Kreuzheben',
  'stiff leg deadlift': 'Kreuzheben mit gestreckten Beinen',
  'hip thrust': 'Hip Thrust',
  'glute bridge': 'Glute Bridge',
  'step up': 'Aufsteiger',
  
  // Core
  'crunch': 'Crunches',
  'sit up': 'Sit-Ups',
  'situp': 'Sit-Ups',
  'plank': 'Plank',
  'leg raise': 'Beinheben',
  'russian twist': 'Russian Twist',
  'mountain climber': 'Mountain Climber',
  'ab wheel': 'Ab Wheel Rollout',
  'ab roller': 'Ab Wheel Rollout',
  
  // Cardio
  'treadmill': 'Laufband',
  'elliptical': 'Crosstrainer',
  'rowing machine': 'Rudergerät',
  'bike': 'Fahrradergometer',
  'cycle': 'Fahrradergometer',
  'jump rope': 'Seilspringen',
  'skipping': 'Seilspringen',
  'burpee': 'Burpees',
  'jumping jack': 'Hampelmann',
  'run': 'Laufen',
  'walk': 'Gehen',
  'sprint': 'Sprinten',
  
  // Stretching
  'stretch': 'Dehnung',
  'neck stretch': 'Nackendehnung',
  'flexion': 'Beugung',
  
  // Equipment-based naming
  'dumbbell': 'Kurzhantel',
  'barbell': 'Langhantel',
  'cable': 'Kabel',
  'machine': 'Maschine',
  'kettlebell': 'Kettlebell',
  'bodyweight': 'Körpergewicht',
}

function findBestTranslation(name: string): string {
  const lowerName = name.toLowerCase().trim()
  
  // Try exact match first
  if (translations[lowerName]) {
    return translations[lowerName]
  }
  
  // Try to find the most specific match
  let bestMatch = ''
  let bestLength = 0
  
  for (const [key, translation] of Object.entries(translations)) {
    if (lowerName.includes(key) && key.length > bestLength) {
      bestMatch = translation
      bestLength = key.length
    }
  }
  
  // If we found a match, try to build a proper German name
  if (bestMatch) {
    // Check for modifiers
    let prefix = ''
    if (lowerName.includes('incline')) prefix = 'Schräg-'
    else if (lowerName.includes('decline')) prefix = 'Negativ-'
    else if (lowerName.includes('seated')) prefix = 'Sitzendes '
    else if (lowerName.includes('standing')) prefix = 'Stehendes '
    else if (lowerName.includes('one arm') || lowerName.includes('single arm')) prefix = 'Einarmiges '
    else if (lowerName.includes('single leg') || lowerName.includes('one leg')) prefix = 'Einbeiniges '
    else if (lowerName.includes('dumbbell')) prefix = 'Kurzhantel-'
    else if (lowerName.includes('barbell')) prefix = 'Langhantel-'
    else if (lowerName.includes('cable')) prefix = 'Kabel-'
    
    return prefix + bestMatch
  }
  
  // Fallback: use the original English name
  return name
}

async function main() {
  console.log('🇩🇪 Applying manual German translations...')
  console.log('='.repeat(50))
  
  const client = await pool.connect()
  
  try {
    // Get all exercises without translations
    const exercises = await client.query(`
      SELECT id, name, name_de 
      FROM exercise 
      WHERE name_de IS NULL OR name_de = name
      ORDER BY name
    `)
    
    console.log(`\n📊 Found ${exercises.rows.length} exercises needing translation\n`)
    
    let translated = 0
    let unchanged = 0
    
    for (const ex of exercises.rows) {
      const germanName = findBestTranslation(ex.name)
      
      if (germanName !== ex.name) {
        await client.query('UPDATE exercise SET name_de = $1 WHERE id = $2', [germanName, ex.id])
        console.log(`✅ ${ex.name} → ${germanName}`)
        translated++
      } else {
        // Still set name_de so it's not null
        await client.query('UPDATE exercise SET name_de = $1 WHERE id = $2', [ex.name, ex.id])
        unchanged++
      }
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('📊 TRANSLATION COMPLETE')
    console.log('='.repeat(50))
    console.log(`✅ Translated: ${translated}`)
    console.log(`➡️  Kept English: ${unchanged}`)
    
    // Show some examples
    console.log('\n📋 Sample translations:')
    const samples = await client.query(`
      SELECT name, name_de FROM exercise 
      WHERE name_de != name 
      ORDER BY RANDOM() 
      LIMIT 10
    `)
    for (const sample of samples.rows) {
      console.log(`   ${sample.name} → ${sample.name_de}`)
    }
    
  } finally {
    client.release()
    await pool.end()
  }
  
  console.log('\n🎉 Done!')
}

main().catch(console.error)
