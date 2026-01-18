#!/bin/bash
# Export PostgreSQL data to SQLite-compatible INSERT statements for D1

DOCKER_CONTAINER="sculpt-db"
OUTPUT_DIR="db/d1/data"
mkdir -p $OUTPUT_DIR

echo "Exporting lookup tables..."

# Body parts
docker exec $DOCKER_CONTAINER psql -U sculpt -d sculpt -t -A -c "
SELECT 'INSERT INTO body_part (id, code, name_de, name_en, icon_name) VALUES (' || 
       id || ', ''' || code || ''', ''' || name_de || ''', ''' || name_en || ''', ''' || COALESCE(icon_name, '') || ''');'
FROM body_part ORDER BY id;
" > $OUTPUT_DIR/body_part.sql

# Equipment
docker exec $DOCKER_CONTAINER psql -U sculpt -d sculpt -t -A -c "
SELECT 'INSERT INTO equipment (id, code, name_de, name_en) VALUES (' || 
       id || ', ''' || code || ''', ''' || name_de || ''', ''' || name_en || ''');'
FROM equipment ORDER BY id;
" > $OUTPUT_DIR/equipment.sql

# Muscles
docker exec $DOCKER_CONTAINER psql -U sculpt -d sculpt -t -A -c "
SELECT 'INSERT INTO muscle (id, code, name_de, name_en) VALUES (' || 
       id || ', ''' || REPLACE(code, '''', '''''') || ''', ''' || REPLACE(name_de, '''', '''''') || ''', ''' || REPLACE(name_en, '''', '''''') || ''');'
FROM muscle ORDER BY id;
" > $OUTPUT_DIR/muscle.sql

# Exercise types
docker exec $DOCKER_CONTAINER psql -U sculpt -d sculpt -t -A -c "
SELECT 'INSERT INTO exercise_type (id, code, name_de, name_en) VALUES (' || 
       id || ', ''' || code || ''', ''' || name_de || ''', ''' || name_en || ''');'
FROM exercise_type ORDER BY id;
" > $OUTPUT_DIR/exercise_type.sql

echo "Exporting exercises..."

# Main exercises table
docker exec $DOCKER_CONTAINER psql -U sculpt -d sculpt -t -A -c "
SELECT 'INSERT INTO exercise (id, external_id, name, name_de, description, description_de, difficulty, duration_seconds, met_value, exercise_type_id, image_url, video_url, created_at, updated_at) VALUES (' || 
       id || ', ''' || COALESCE(external_id, '') || ''', ''' || REPLACE(name, '''', '''''') || ''', ' || 
       COALESCE('''' || REPLACE(name_de, '''', '''''') || '''', 'NULL') || ', ' ||
       COALESCE('''' || REPLACE(REPLACE(description, '''', ''''''), E'\n', ' ') || '''', 'NULL') || ', ' ||
       COALESCE('''' || REPLACE(REPLACE(description_de, '''', ''''''), E'\n', ' ') || '''', 'NULL') || ', ' ||
       COALESCE('''' || difficulty || '''', 'NULL') || ', ' ||
       COALESCE(duration_seconds::text, 'NULL') || ', ' ||
       COALESCE(met_value::text, 'NULL') || ', ' ||
       COALESCE(exercise_type_id::text, 'NULL') || ', ' ||
       COALESCE('''' || REPLACE(image_url, '''', '''''') || '''', 'NULL') || ', ' ||
       COALESCE('''' || REPLACE(video_url, '''', '''''') || '''', 'NULL') || ', ' ||
       '''' || created_at || ''', ''' || updated_at || ''');'
FROM exercise ORDER BY id;
" > $OUTPUT_DIR/exercise.sql

# Exercise body parts
docker exec $DOCKER_CONTAINER psql -U sculpt -d sculpt -t -A -c "
SELECT 'INSERT INTO exercise_body_part (exercise_id, body_part_id) VALUES (' || 
       exercise_id || ', ' || body_part_id || ');'
FROM exercise_body_part ORDER BY exercise_id, body_part_id;
" > $OUTPUT_DIR/exercise_body_part.sql

# Exercise equipment
docker exec $DOCKER_CONTAINER psql -U sculpt -d sculpt -t -A -c "
SELECT 'INSERT INTO exercise_equipment (exercise_id, equipment_id) VALUES (' || 
       exercise_id || ', ' || equipment_id || ');'
FROM exercise_equipment ORDER BY exercise_id, equipment_id;
" > $OUTPUT_DIR/exercise_equipment.sql

# Exercise target muscles
docker exec $DOCKER_CONTAINER psql -U sculpt -d sculpt -t -A -c "
SELECT 'INSERT INTO exercise_target_muscle (exercise_id, muscle_id) VALUES (' || 
       exercise_id || ', ' || muscle_id || ');'
FROM exercise_target_muscle ORDER BY exercise_id, muscle_id;
" > $OUTPUT_DIR/exercise_target_muscle.sql

# Exercise secondary muscles
docker exec $DOCKER_CONTAINER psql -U sculpt -d sculpt -t -A -c "
SELECT 'INSERT INTO exercise_secondary_muscle (exercise_id, muscle_id) VALUES (' || 
       exercise_id || ', ' || muscle_id || ');'
FROM exercise_secondary_muscle ORDER BY exercise_id, muscle_id;
" > $OUTPUT_DIR/exercise_secondary_muscle.sql

# Exercise instructions
docker exec $DOCKER_CONTAINER psql -U sculpt -d sculpt -t -A -c "
SELECT 'INSERT INTO exercise_instruction (id, exercise_id, step_number, instruction_text, instruction_text_de) VALUES (' || 
       id || ', ' || exercise_id || ', ' || step_number || ', ''' || 
       REPLACE(REPLACE(instruction_text, '''', ''''''), E'\n', ' ') || ''', ' ||
       COALESCE('''' || REPLACE(REPLACE(instruction_text_de, '''', ''''''), E'\n', ' ') || '''', 'NULL') || ');'
FROM exercise_instruction ORDER BY exercise_id, step_number;
" > $OUTPUT_DIR/exercise_instruction.sql

# Exercise tips
docker exec $DOCKER_CONTAINER psql -U sculpt -d sculpt -t -A -c "
SELECT 'INSERT INTO exercise_tip (id, exercise_id, tip_number, tip_text, tip_text_de) VALUES (' || 
       id || ', ' || exercise_id || ', ' || tip_number || ', ''' || 
       REPLACE(REPLACE(tip_text, '''', ''''''), E'\n', ' ') || ''', ' ||
       COALESCE('''' || REPLACE(REPLACE(tip_text_de, '''', ''''''), E'\n', ' ') || '''', 'NULL') || ');'
FROM exercise_tip ORDER BY exercise_id, tip_number;
" > $OUTPUT_DIR/exercise_tip.sql

# Count exported files
echo ""
echo "Export complete! Files created:"
for f in $OUTPUT_DIR/*.sql; do
  lines=$(wc -l < "$f")
  echo "  $(basename $f): $lines rows"
done
