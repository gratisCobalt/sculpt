/**
 * TOON Parser - Token-Optimized Object Notation
 * 
 * TOON uses indentation instead of {} and , like YAML.
 * It's designed for efficient AI output and streaming.
 * 
 * Example:
 * training_plan:
 *   name: Push Pull Legs
 *   days:
 *     - name: Push
 *       exercises:
 *         - exercise_id: 42
 *           sets: 3
 */

type TOONValue = string | number | boolean | null | TOONObject | TOONArray
type TOONObject = { [key: string]: TOONValue }
type TOONArray = TOONValue[]

interface ParsedLine {
  indent: number
  key: string | null
  value: string | null
  isArrayItem: boolean
  raw: string
}

function parseLine(line: string): ParsedLine | null {
  // Skip empty lines and comments
  if (!line.trim() || line.trim().startsWith('#')) {
    return null
  }

  // Count leading spaces (2 spaces = 1 indent level)
  const leadingSpaces = line.match(/^( *)/)?.[1].length || 0
  const indent = Math.floor(leadingSpaces / 2)

  const trimmed = line.trim()

  // Check if it's an array item
  const isArrayItem = trimmed.startsWith('- ')
  const content = isArrayItem ? trimmed.slice(2) : trimmed

  // Parse key: value
  const colonIndex = content.indexOf(':')
  
  if (colonIndex === -1) {
    // Just a value (for array items without key)
    return {
      indent,
      key: null,
      value: content,
      isArrayItem,
      raw: line
    }
  }

  const key = content.slice(0, colonIndex).trim()
  const valueStr = content.slice(colonIndex + 1).trim()

  return {
    indent,
    key,
    value: valueStr || null,
    isArrayItem,
    raw: line
  }
}

function parseValue(str: string | null): TOONValue {
  if (str === null || str === '' || str === 'null') return null
  if (str === 'true') return true
  if (str === 'false') return false
  
  // Try parsing as number
  const num = Number(str)
  if (!isNaN(num) && str !== '') return num

  // Remove quotes if present
  if ((str.startsWith('"') && str.endsWith('"')) || 
      (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1)
  }

  return str
}

export function parseTOON(text: string): TOONValue {
  const lines = text.split('\n')
  const parsedLines = lines.map(parseLine).filter((l): l is ParsedLine => l !== null)

  if (parsedLines.length === 0) {
    return null
  }

  // Stack-based parser
  interface StackItem {
    indent: number
    obj: TOONObject | TOONArray
    key?: string
  }

  const root: TOONObject = {}
  const stack: StackItem[] = [{ indent: -1, obj: root }]

  for (let i = 0; i < parsedLines.length; i++) {
    const line = parsedLines[i]
    const nextLine = parsedLines[i + 1]

    // Pop stack until we find parent at lower indent
    while (stack.length > 1 && stack[stack.length - 1].indent >= line.indent) {
      stack.pop()
    }

    const parent = stack[stack.length - 1]

    if (line.isArrayItem) {
      // This is an array item
      let arr: TOONArray

      if (Array.isArray(parent.obj)) {
        arr = parent.obj
      } else if (parent.key && Array.isArray((parent.obj as TOONObject)[parent.key])) {
        arr = (parent.obj as TOONObject)[parent.key] as TOONArray
      } else {
        // Should not happen in well-formed TOON
        continue
      }

      if (line.key && line.value === null && nextLine && nextLine.indent > line.indent) {
        // Array item with nested object
        const newObj: TOONObject = {}
        newObj[line.key] = null // Will be filled by children
        arr.push(newObj)
        stack.push({ indent: line.indent, obj: newObj, key: line.key })
      } else if (line.key) {
        // Array item is an object with key: value
        const newObj: TOONObject = { [line.key]: parseValue(line.value) }
        arr.push(newObj)
        stack.push({ indent: line.indent, obj: newObj })
      } else {
        // Array item is just a value
        arr.push(parseValue(line.value))
      }
    } else if (line.key) {
      const parentObj = parent.obj as TOONObject

      if (line.value === null && nextLine) {
        // Check if next line is a child
        if (nextLine.indent > line.indent) {
          if (nextLine.isArrayItem) {
            // This key holds an array
            parentObj[line.key] = []
            stack.push({ indent: line.indent, obj: parentObj[line.key] as TOONArray })
          } else {
            // This key holds an object
            parentObj[line.key] = {}
            stack.push({ indent: line.indent, obj: parentObj[line.key] as TOONObject, key: line.key })
          }
        } else {
          parentObj[line.key] = null
        }
      } else {
        parentObj[line.key] = parseValue(line.value)
      }
    }
  }

  // Return the first (and should be only) key's value from root
  const keys = Object.keys(root)
  if (keys.length === 1) {
    return root[keys[0]]
  }
  return root
}

// Interface for parsed training plan from TOON
export interface TOONTrainingPlan {
  name: string
  description?: string
  days: {
    name: string
    day_number: number
    exercises: {
      exercise_id: number
      sets: number
      min_reps: number
      max_reps: number
      rest_seconds: number
      notes?: string
    }[]
  }[]
}

// Validate and type-check the parsed TOON
export function validateTrainingPlan(data: unknown): { valid: true; plan: TOONTrainingPlan } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid training plan data' }
  }

  const plan = data as Record<string, unknown>

  if (typeof plan.name !== 'string' || plan.name.length === 0) {
    return { valid: false, error: 'Training plan must have a name' }
  }

  if (!Array.isArray(plan.days) || plan.days.length === 0) {
    return { valid: false, error: 'Training plan must have at least one day' }
  }

  for (let i = 0; i < plan.days.length; i++) {
    const day = plan.days[i] as Record<string, unknown>

    if (typeof day.name !== 'string') {
      return { valid: false, error: `Day ${i + 1} must have a name` }
    }

    if (typeof day.day_number !== 'number' || day.day_number < 1) {
      return { valid: false, error: `Day ${i + 1} must have a valid day_number` }
    }

    if (!Array.isArray(day.exercises) || day.exercises.length === 0) {
      return { valid: false, error: `Day ${day.name} must have at least one exercise` }
    }

    for (let j = 0; j < day.exercises.length; j++) {
      const ex = day.exercises[j] as Record<string, unknown>

      if (typeof ex.exercise_id !== 'number') {
        return { valid: false, error: `Exercise ${j + 1} in ${day.name} must have an exercise_id` }
      }

      if (typeof ex.sets !== 'number' || ex.sets < 1 || ex.sets > 10) {
        return { valid: false, error: `Exercise ${j + 1} in ${day.name}: sets must be 1-10` }
      }

      if (typeof ex.min_reps !== 'number' || ex.min_reps < 1 || ex.min_reps > 50) {
        return { valid: false, error: `Exercise ${j + 1} in ${day.name}: min_reps must be 1-50` }
      }

      if (typeof ex.max_reps !== 'number' || ex.max_reps < 1 || ex.max_reps > 50) {
        return { valid: false, error: `Exercise ${j + 1} in ${day.name}: max_reps must be 1-50` }
      }

      if (ex.min_reps > ex.max_reps) {
        return { valid: false, error: `Exercise ${j + 1} in ${day.name}: min_reps cannot exceed max_reps` }
      }

      if (typeof ex.rest_seconds !== 'number' || ex.rest_seconds < 30 || ex.rest_seconds > 300) {
        return { valid: false, error: `Exercise ${j + 1} in ${day.name}: rest_seconds must be 30-300` }
      }
    }
  }

  return { valid: true, plan: plan as unknown as TOONTrainingPlan }
}
