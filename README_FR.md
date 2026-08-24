# Heures pleines et creuses de DeepSeek — jours ouvrés à l'heure de Pékin, pas en UTC

[English](./README.md) · [中文](./README_CN.md) · [Español](./README_ES.md) · [日本語](./README_JA.md) · [한국어](./README_KO.md) · [Tiếng Việt](./README_VI.md) · **Français** · [Deutsch](./README_DE.md) · [Русский](./README_RU.md) · [Bahasa Indonesia](./README_ID.md)

Les heures pleines vont du **lundi au vendredi, 09:00–12:00 et 14:00–18:00 heure de Pékin** — soit `01:00-04:00` et `06:00-10:00` UTC — et tout le reste est en heures creuses, à moitié prix. Depuis le 2026-08-23, le week-end entier est en heures creuses, et ce week-end est borné à l'heure de Pékin : il court **du vendredi 16:00 UTC au dimanche 16:00 UTC**, et non de minuit à minuit UTC. Ce dépôt est la table de tests datée qui fixe ces bornes, plus une implémentation de référence d'une trentaine de lignes.

**Sommes-nous en heures pleines en ce moment ?** [Cette page y répond en direct](https://xyzs996.github.io/llm-api-pricing/deepseek-peak-hours.html) : elle résout l'horloge dans votre navigateur, applique la règle du jour de la semaine et celle du week-end, puis vous dit de quel côté du tarif vous êtes et dans combien de temps cela change. Sans compte, sans rien à installer.

**Neuf plugins de facturation DeepSeek publiés, passés au crible de cette table : trois réussissent tout.** Aucune dépendance, Node 16+ ; la fonction de chaque projet est transcrite dans `conformance/adapters.mjs`, figée sur un commit.

```
git clone https://github.com/xyzs996/deepseek-peak-hours && cd deepseek-peak-hours
node conformance/run.mjs --detail
```

## Tarifs (USD par million de tokens, creuses / pleines)

| Modèle | Entrée, cache touché | Entrée, cache manqué | Sortie |
| --- | ---: | ---: | ---: |
| `deepseek-v4-flash` | 0.007 / 0.014 | 0.22 / 0.44 | 0.66 / 1.32 |
| `deepseek-v4-flash-vision-exp` | 0.007 / 0.014 | 0.22 / 0.44 | 0.66 / 1.32 |
| `deepseek-v4-pro` | 0.022 / 0.044 | 0.66 / 1.32 | 1.98 / 3.96 |

Relevés le 2026-08-23 sur <https://api-docs.deepseek.com/quick_start/pricing/>. Les prix changent ; la page du fournisseur fait foi.

## Ce que disent les deux versions de la page du fournisseur

> **EN** — Off-peak rates are half of the peak rates. Peak hours are 01:00 - 04:00 and 06:00 - 10:00 UTC, Monday through Friday (all other hours are off-peak).

> **ZH** — 空闲时段价格为高峰时段价格的一半。高峰时段为北京时间周一至周五 9:00 - 12:00、14:00 - 18:00（其余为空闲时段）。

Les deux citations restent dans leur langue d'origine : ce sont des preuves, et traduites elles ne sont plus des citations. Les heures concordent — 09:00–12:00 et 14:00–18:00 à Pékin *sont* 01:00–04:00 et 06:00–10:00 UTC. Le calendrier, non. La phrase chinoise place les jours ouvrés à l'heure de Pékin (北京时间周一至周五) ; l'anglaise accroche `UTC` aux heures et laisse « Monday through Friday » sans ancrage, ce qui se lit comme des jours ouvrés UTC. Les deux lectures divergent seulement entre 16:00 et 24:00 UTC le vendredi et le dimanche : seize heures par semaine. Ce dépôt suit la formulation chinoise.

## Trois façons de se tromper, et la troisième est invisible

**1. Rétroactivité.** Les fonctions de tarification sont appelées avec des horodatages passés — rejeu de grand livre, recalcul de consommation, tableaux de bord de coûts sur des requêtes anciennes. Une remise de week-end appliquée sans condition ampute discrètement de moitié toute facture de week-end antérieure à la règle. La remise doit être conditionnée à l'instant d'entrée en vigueur, et pour un compte à rebours la condition porte sur l'instant *candidat*, pas sur « maintenant ».

**2. Le compte à rebours tombe à l'intérieur du week-end.** Dans le week-end, les deux côtés de chaque bord de fenêtre sont en heures creuses : un compte à rebours qui s'arrête au bord suivant atteint zéro sans que rien ne change. À partir du vendredi 18:30 à Pékin, le prochain vrai changement est le lundi à 09:00 — environ 63 heures, assez pour faire déborder certaines chaînes d'interface.

**3. Le jour de la semaine est lu sur le mauvais calendrier — et aucun test contre l'horaire en vigueur ne peut le voir.** Le week-end pékinois court **du vendredi 16:00 UTC au dimanche 16:00 UTC**. Les deux calendriers ne divergent qu'entre 16:00 et 24:00 UTC, et les deux fenêtres pleines de DeepSeek se tiennent à l'écart de cette plage. Une implémentation qui lit le jour sur l'instant non décalé passe donc tous les vecteurs que vous pouvez écrire contre les fenêtres officielles, et se met à mentir le jour où un fournisseur décale une fenêtre au-delà de 16:00 UTC.

## Les deux instants qui fixent l'axe calendaire

`2026-08-28T16:30:00Z` et `2026-08-30T16:30:00Z`. La table porte en outre un horaire **clairement étiqueté comme synthétique** dont la fenêtre pleine couvre 16:00–22:00 UTC. Ce n'est pas un horaire réel de fournisseur et il n'est pas présenté comme tel : c'est le seul moyen de fixer l'axe calendaire. Accessoirement, si votre code de tarification n'est pas paramétré par horaire, cet axe est tout simplement intestable — ce qui vaut déjà la peine d'être su.

## Utilisation

Soit vous portez `phase_at` — trente lignes sans surprise, l'horaire étant une donnée — soit vous ignorez complètement le Python et collez le tableau `vectors` dans ce que votre projet utilise pour les tests pilotés par table. Chaque entrée est un instant UTC, l'heure murale pékinoise correspondante, la phase attendue, et une ligne sur ce qu'elle discrimine.

```
python3 check_vectors.py     # 20/20 passed
```

## Ailleurs

- La même règle en prose, les deux versions de la note du fournisseur côte à côte, et chaque tarif relu chaque jour : <https://xyzs996.github.io/llm-api-pricing/deepseek-peak-hours.html> · [telegra.ph](https://telegra.ph/DeepSeek-peak-and-off-peak-hours-08-23)
- Un calculateur qui applique ces règles à une facture réelle : choisissez un modèle, entrez votre répartition de tokens, il vous dit de quel côté du tarif vous êtes en ce moment et ce que vaut l'attente : <https://xyzs996.github.io/llm-cost-calculator/>
- Le README anglais complet (vecteurs détaillés, table des mutations, et l'échantillon de 19 implémentations) : <https://github.com/xyzs996/deepseek-peak-hours/blob/main/README.md>
