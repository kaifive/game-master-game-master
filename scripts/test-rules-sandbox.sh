#!/bin/sh
# Runs the security rules tests by starting the emulator jars directly.
#
# Use this only where `npm run test:rules` can't reach the emulators: the
# Firebase CLI sends even localhost traffic through HTTPS_PROXY, which some
# cloud sandboxes block. On a normal machine and in CI, use npm run test:rules.
set -eu

E="${HOME}/.cache/firebase/emulators"
npx firebase setup:emulators:firestore >/dev/null
npx firebase setup:emulators:database >/dev/null
FS_JAR=$(ls "$E"/cloud-firestore-emulator-*.jar | tail -1)
DB_JAR=$(ls "$E"/firebase-database-emulator-*.jar | tail -1)

java -jar "$FS_JAR" --host=127.0.0.1 --port=8080 >/dev/null 2>&1 &
FS_PID=$!
java -jar "$DB_JAR" --host 127.0.0.1 --port 9000 >/dev/null 2>&1 &
DB_PID=$!
trap 'kill $FS_PID $DB_PID 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  if curl -s --noproxy '*' 127.0.0.1:8080 >/dev/null && curl -s --noproxy '*' 127.0.0.1:9000/.json >/dev/null; then
    break
  fi
  sleep 1
done

FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 \
  npx vitest run --config vitest.rules.config.mts
