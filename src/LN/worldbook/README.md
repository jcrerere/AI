# LN Worldbook Starter

This folder contains the LN MVU-ready worldbook variable starter.

Files:
- variables_init.yaml: initial variables (includes six-dimension stats, check formulas, generation pools)
- variables_update_rule.yaml: update rules (includes combat/social checks and generation triggers)
- variables_output_format.yaml: JSON patch contract + optional npcdata contract + status tag format
- prompts/cot_LN.ini: runtime CoT guardrails
- prompts/cot_opening_LN.ini: opening CoT guardrails
- prompts/正文模板_LN.txt: narrative + npcdata output order

Suggested workflow:
1. Copy `variables_init.yaml` into your worldbook variable init entry.
2. Put update rules + output format into your variable updater prompt.
3. Ensure the model outputs status tags and optional `<npcdata>` exactly as defined in `variables_output_format.yaml`.
4. During play, use reputation/resources/scene context as your gate rules.
5. Let the worldbook decide NPC structure; let the frontend only parse and render it.
