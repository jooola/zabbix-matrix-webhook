#!/usr/bin/env node

import { load, dump } from "js-yaml"
import { readFileSync, writeFileSync } from "fs"

// Regenerate YAML/JSON file
const filename = "media_matrix"

const webhook = load(readFileSync(filename + ".yml", { encoding: "utf-8" }))
const script = readFileSync("matrix.js", { encoding: "utf-8" })

webhook.zabbix_export.media_types[0].script = script

writeFileSync(filename + ".yml", dump(webhook, { lineWidth: -1, quotingType: '"' }))
writeFileSync(filename + ".json", JSON.stringify(webhook, null, 2))
