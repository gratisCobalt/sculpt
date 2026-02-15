/**
 * Download all exercises from API to local JSON file
 * 
 * This saves API calls by caching all exercise data locally.
 * The data can then be imported into the database without API calls.
 */

import fs from 'fs'
import path from 'path'

const API_BASE = 'https://exercise-db-with-videos-and-images-by-ascendapi.p.rapidapi.com/api/v1'
const API_KEY = 'af7f90eb4emsh40401dc13b6686fp14cb55jsn447a809b8285'
const API_HOST = 'exercise-db-with-videos-and-images-by-ascendapi.p.rapidapi.com'

const headers = {
  'X-RapidAPI-Key': API_KEY,
  'X-RapidAPI-Host': API_HOST,
}

const OUTPUT_FILE = path.join(process.cwd(), 'data', 'exercises-cache.json')

interface ExerciseListItem {
  exerciseId: string
  name: string
  imageUrl: string
  bodyParts?: string[]
  equipments?: string[]
  exerciseType?: string
  targetMuscles?: string[]
  secondaryMuscles?: string[]
  keywords?: string[]
}

interface ExerciseDetail {
  exerciseId: string
  name: string
  imageUrl: string
  imageUrls?: Record<string, string>
  equipments?: string[]
  bodyParts?: string[]
  exerciseType?: string
  targetMuscles?: string[]
  secondaryMuscles?: string[]
  videoUrl?: string
  keywords?: string[]
  overview?: string
  instructions?: string[]
  exerciseTips?: string[]
  variations?: string[]
  relatedExerciseIds?: string[]
}

async function fetchExercisePage(cursor: string | null): Promise<{ data: ExerciseListItem[], nextCursor: string | null }> {
  const url = cursor 
    ? `${API_BASE}/exercises?limit=50&cursor=${cursor}` 
    : `${API_BASE}/exercises?limit=50`
  
  const res = await fetch(url, { headers })
  const json = await res.json()
  
  if (json.success && json.data) {
    return { 
      data: json.data, 
      nextCursor: json.meta?.nextCursor || null 
    }
  }
  console.error('API Error:', json)
  return { data: [], nextCursor: null }
}

async function fetchExerciseDetail(exerciseId: string): Promise<ExerciseDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/exercises/${exerciseId}`, { headers })
    const json = await res.json()
    if (json.success) return json.data
    return null
  } catch (e) {
    console.error(`Failed to fetch ${exerciseId}:`, e)
    return null
  }
}

async function main() {
  console.log('📥 Downloading all exercises from API...')
  console.log('='.repeat(50))
  
  // Create data directory if not exists
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  
  // Check if we have a partial download to resume
  let cache: { exercises: ExerciseDetail[], downloadedIds: Set<string>, lastCursor: string | null } = {
    exercises: [],
    downloadedIds: new Set(),
    lastCursor: null
  }
  
  const partialFile = OUTPUT_FILE + '.partial'
  if (fs.existsSync(partialFile)) {
    console.log('📂 Found partial download, resuming...')
    const partial = JSON.parse(fs.readFileSync(partialFile, 'utf-8'))
    cache.exercises = partial.exercises || []
    cache.downloadedIds = new Set(partial.downloadedIds || [])
    cache.lastCursor = partial.lastCursor
    console.log(`   Already have ${cache.exercises.length} exercises\n`)
  }
  
  // Step 1: Get all exercise IDs
  console.log('📋 Fetching exercise list...')
  const allExerciseIds: ExerciseListItem[] = []
  let cursor: string | null = cache.lastCursor
  let page = 1
  
  do {
    const result = await fetchExercisePage(cursor)
    allExerciseIds.push(...result.data)
    cursor = result.nextCursor
    
    if (page % 20 === 0) {
      console.log(`  Page ${page}: ${allExerciseIds.length} exercises`)
    }
    page++
    
    await new Promise(r => setTimeout(r, 150))
  } while (cursor)
  
  console.log(`\n✅ Found ${allExerciseIds.length} exercises in API\n`)
  
  // Step 2: Download details for each exercise
  console.log('📥 Downloading exercise details...\n')
  
  const startTime = Date.now()
  let downloaded = 0
  let skipped = 0
  let failed = 0
  
  for (let i = 0; i < allExerciseIds.length; i++) {
    const exercise = allExerciseIds[i]
    
    // Skip if already downloaded
    if (cache.downloadedIds.has(exercise.exerciseId)) {
      skipped++
      continue
    }
    
    // Progress update
    if ((downloaded + 1) % 100 === 0 || downloaded === 0) {
      const elapsed = (Date.now() - startTime) / 1000
      const rate = (downloaded + 1) / elapsed
      const remaining = (allExerciseIds.length - i - 1) / rate
      console.log(`[${i + 1}/${allExerciseIds.length}] Downloaded: ${downloaded}, Rate: ${Math.round(rate * 60)}/min, ~${Math.round(remaining / 60)}min remaining`)
      
      // Save partial progress every 100 exercises
      fs.writeFileSync(partialFile, JSON.stringify({
        exercises: cache.exercises,
        downloadedIds: Array.from(cache.downloadedIds),
        lastCursor: null
      }))
    }
    
    const detail = await fetchExerciseDetail(exercise.exerciseId)
    if (detail) {
      cache.exercises.push(detail)
      cache.downloadedIds.add(exercise.exerciseId)
      downloaded++
    } else {
      failed++
    }
    
    await new Promise(r => setTimeout(r, 200)) // Rate limiting
  }
  
  // Save final result
  console.log('\n💾 Saving to disk...')
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
    downloadedAt: new Date().toISOString(),
    totalCount: cache.exercises.length,
    exercises: cache.exercises
  }, null, 2))
  
  // Remove partial file
  if (fs.existsSync(partialFile)) {
    fs.unlinkSync(partialFile)
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 DOWNLOAD COMPLETE')
  console.log('='.repeat(50))
  console.log(`✅ Downloaded: ${downloaded}`)
  console.log(`⏭️  Skipped (already had): ${skipped}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📦 Total in cache: ${cache.exercises.length}`)
  console.log(`\n📂 Saved to: ${OUTPUT_FILE}`)
  console.log(`\n⏭️  Next: Run 'npx tsx scripts/import-from-cache.ts' to import into database`)
}

main().catch(console.error)
