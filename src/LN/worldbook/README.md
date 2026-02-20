# LN Worldbook Starter

This folder contains the LN MVU-ready worldbook variable starter.

Files:
- variables_init.yaml: initial variables (includes six-dimension stats, check formulas, generation pools)
- variables_update_rule.yaml: update rules (includes combat/social checks and generation triggers)
- variables_output_format.yaml: JSON patch contract + generation payload + status tag format

Suggested workflow:
1. Copy `variables_init.yaml` into your worldbook variable init entry.
2. Put update rules + output format into your variable updater prompt.
3. Ensure the model outputs status tags exactly as defined in `variables_output_format.yaml`.
4. During play, use reputation/resources/scene context as your gate rules.
