# Changelog

## [v0.1.0](https://github.com/jooola/zabbix-matrix-webhook/releases/tag/v0.1.0)

### Features

- prefer icon to alert subject state prefixes
- add update message icon
- add optional event_url link
- smaller alert messages
- send notice instead of text message
- rename variables
- generate media_matrix.yml for 5.0
- simplify messages templates
- generate media_matrix.json
- send icons to identify alert severities
- add subject in the alert message

### Bug Fixes

- **deps**: update dependency js-yaml to v5 (#70)
- webhook js must be es5 compatible
- wrong zabbix config version number
- update HttpRequest property naming
- upgrade script to work with zabbix 6.2
