# LN Regional Economy Model

## Core

- Baseline district: `艾瑞拉区`
- Currency: `灵能币`
- Shop prices use retail cash prices
- Living metrics use a mixed baseline basket so Engel coefficients can be derived without forcing every district into one flat multiplier

## Basket

Base daily equivalent basket:

- Food: `14`
- Housing: `10`
- Transit: `4`
- Daily apparel/basic wear: `3`
- Medicine/basic recovery: `2`
- General service/comms: `1`

Total baseline equivalent basket: `34 灵能币/日`

## District Directions

- `艾瑞拉区`: high-welfare stable core, comfortable but not ostentatious
- `诺丝区`: capital-distorted zone, cheap public tech and low-end goods coexist with brutal housing, identity consumption and nightlife pressure
- `汐屿区`: tourism sink and external revenue recovery zone
- `圣教区`: rationed legal circulation, low cash burden for basics but tight quota control
- `淬灵区`: low-income industrial pressure zone, medicine and imports stay expensive
- `狗镇 / 交界地`: risk premium dominates
- `栖灵区`: scarcity and transport isolation dominate

## Runtime

- Economy digest syncs into `world.economy_digest`
- City ledger panel shows:
  - minimum daily cash / equivalent cost
  - median daily consumption
  - average daily consumption
  - median / average daily income
  - median Engel ratio
- Shop prices now use:
  - district retail multiplier
  - shop tier
  - small volatility
  - loyalty discount
  - backroom risk factor
