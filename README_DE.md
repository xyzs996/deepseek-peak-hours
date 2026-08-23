# DeepSeek Peak- und Off-Peak-Zeiten — Wochentage nach Pekinger Zeit, nicht nach UTC

[English](./README.md) · [中文](./README_CN.md) · [Español](./README_ES.md) · [日本語](./README_JA.md) · [한국어](./README_KO.md) · [Tiếng Việt](./README_VI.md) · [Français](./README_FR.md) · **Deutsch** · [Русский](./README_RU.md) · [Bahasa Indonesia](./README_ID.md)

Peak ist **Montag bis Freitag, 09:00–12:00 und 14:00–18:00 Pekinger Zeit** — also `01:00-04:00` und `06:00-10:00` UTC — alles andere ist Off-Peak zum halben Preis. Seit dem 2026-08-23 ist das gesamte Wochenende Off-Peak, und dieses Wochenende ist in Pekinger Zeit begrenzt: es läuft **von Freitag 16:00 UTC bis Sonntag 16:00 UTC**, nicht von Mitternacht bis Mitternacht UTC. Dieses Repository ist die datierte Testtabelle, die diese Kanten festnagelt, plus eine Referenzimplementierung von rund dreißig Zeilen.

## Preise (USD je Million Tokens, Off-Peak / Peak)

| Modell | Eingabe, Cache-Treffer | Eingabe, Cache-Fehltreffer | Ausgabe |
| --- | ---: | ---: | ---: |
| `deepseek-v4-flash` | 0.007 / 0.014 | 0.22 / 0.44 | 0.66 / 1.32 |
| `deepseek-v4-flash-vision-exp` | 0.007 / 0.014 | 0.22 / 0.44 | 0.66 / 1.32 |
| `deepseek-v4-pro` | 0.022 / 0.044 | 0.66 / 1.32 | 1.98 / 3.96 |

Gelesen am 2026-08-23 unter <https://api-docs.deepseek.com/quick_start/pricing/>. Preise ändern sich; maßgeblich ist die Seite des Anbieters.

## Was die beiden Sprachfassungen der Anbieterseite sagen

> **EN** — Off-peak rates are half of the peak rates. Peak hours are 01:00 - 04:00 and 06:00 - 10:00 UTC, Monday through Friday (all other hours are off-peak).

> **ZH** — 空闲时段价格为高峰时段价格的一半。高峰时段为北京时间周一至周五 9:00 - 12:00、14:00 - 18:00（其余为空闲时段）。

Beide Zitate bleiben in der Originalsprache: sie sind der Beleg, und übersetzt sind sie kein Zitat mehr. Die Uhrzeiten stimmen überein — 09:00–12:00 und 14:00–18:00 Pekinger Zeit *sind* 01:00–04:00 und 06:00–10:00 UTC. Der Kalender nicht. Der chinesische Satz verortet die Wochentage in Pekinger Zeit (北京时间周一至周五); der englische hängt `UTC` an die Stunden und lässt „Monday through Friday“ unverankert, was sich wie UTC-Wochentage liest. Die beiden Lesarten unterscheiden sich nur zwischen 16:00 und 24:00 UTC am Freitag und am Sonntag — sechzehn Stunden pro Woche. Dieses Repository folgt der chinesischen Formulierung.

## Drei Arten, es falsch zu machen — die dritte ist unsichtbar

**1. Rückwirkung.** Preisfunktionen werden mit historischen Zeitstempeln aufgerufen — Ledger-Replay, Nachberechnung von Verbrauch, Kosten-Dashboards über vergangene Requests. Ein bedingungsloser Wochenendrabatt halbiert still und leise jede Wochenendrechnung aus der Zeit vor der Regel. Der Rabatt muss am Inkrafttretenszeitpunkt hängen, und bei einem Countdown greift die Bedingung auf den *geprüften* Zeitpunkt, nicht auf „jetzt“.

**2. Der Countdown landet innerhalb des Wochenendes.** Im Wochenende sind beide Seiten jeder Fensterkante Off-Peak; ein Countdown, der an der nächsten Kante hält, erreicht also null, ohne dass sich etwas ändert. Ab Freitag 18:30 Pekinger Zeit ist die nächste echte Änderung Montag 09:00 — rund 63 Stunden, lang genug, dass manche UI-Strings überlaufen.

**3. Der Wochentag wird aus dem falschen Kalender gelesen — und kein Test gegen den aktuellen Fahrplan kann das zeigen.** Das Pekinger Wochenende läuft **von Freitag 16:00 UTC bis Sonntag 16:00 UTC**. Die beiden Kalender weichen nur zwischen 16:00 und 24:00 UTC voneinander ab, und beide Peak-Fenster von DeepSeek liegen außerhalb dieser Spanne. Eine Implementierung, die den Wochentag am unverschobenen Zeitpunkt abliest, besteht deshalb jeden Vektor, den man gegen die offiziellen Fenster schreiben kann — und fängt an dem Tag an zu lügen, an dem ein Anbieter ein Fenster hinter 16:00 UTC schiebt.

## Die beiden Zeitpunkte, die die Kalenderachse festnageln

`2026-08-28T16:30:00Z` und `2026-08-30T16:30:00Z`. Die Tabelle enthält außerdem einen **ausdrücklich als synthetisch gekennzeichneten** Fahrplan, dessen Peak-Fenster 16:00–22:00 UTC abdeckt. Er ist kein realer Anbieter-Fahrplan und wird auch nicht als solcher angeboten — er ist die einzige Möglichkeit, die Kalenderachse festzunageln. Nebenbei: ist Ihr Preis-Code nicht über den Fahrplan parametrisiert, lässt sich diese Achse überhaupt nicht testen, und schon das ist es wert, gewusst zu werden.

## Verwendung

Entweder portieren Sie `phase_at` — dreißig langweilige Zeilen, und der Fahrplan ist bloß Daten — oder Sie ignorieren das Python ganz und fügen das `vectors`-Array in das ein, was Ihr Projekt für tabellengetriebene Tests nutzt. Jeder Eintrag ist ein UTC-Zeitpunkt, die zugehörige Pekinger Wanduhrzeit, die erwartete Phase und eine Zeile dazu, was er unterscheidet.

```
python3 check_vectors.py     # 18/18 passed
```

## Anderswo

- Dieselbe Regel in Prosa, beide Sprachfassungen der Anbieter-Fußnote nebeneinander, und jeder Tarif täglich neu gelesen: <https://xyzs996.github.io/llm-api-pricing/deepseek-peak-hours.html>
- Ein Rechner, der diese Regeln auf eine echte Rechnung anwendet — Modell wählen, Token-Mix eintragen, und er sagt Ihnen, auf welcher Seite der Preisliste Sie gerade stehen und was Warten wert ist: <https://xyzs996.github.io/llm-cost-calculator/>
- Das vollständige englische README (Vektoren im Einzelnen, die Mutationstabelle und die Stichprobe aus 19 Implementierungen): <https://github.com/xyzs996/deepseek-peak-offpeak-vectors/blob/main/README.md>
