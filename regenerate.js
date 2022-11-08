#!/usr/bin/env node

import { load, dump } from "js-yaml"
import { readFileSync, writeFileSync } from "fs"

function regenerate(script_path, webhook_path) {
  const script_blob = readFileSync(script_path, { encoding: "utf-8" })
  const webhook_blob = readFileSync(webhook_path, { encoding: "utf-8" })

  const webhook = webhook_path.endsWith(".json") ? JSON.parse(webhook_blob) : load(webhook_blob)

  webhook.zabbix_export.media_types[0].script = script_blob

  const webhook_result = webhook_path.endsWith(".json")
    ? JSON.stringify(webhook, null, 2)
    : dump(webhook, { lineWidth: -1, quotingType: '"' })

  writeFileSync(webhook_path, webhook_result)
}

regenerate("5.0/matrix.js", "5.0/media_matrix.json")
regenerate("latest/matrix.js", "latest/media_matrix.yml")
