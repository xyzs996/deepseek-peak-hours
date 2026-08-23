# DeepSeek 高峰与空闲时段:按北京时间的工作日算,不是按 UTC

[English](./README.md) · **中文** · [Español](./README_ES.md) · [日本語](./README_JA.md) · [한국어](./README_KO.md) · [Tiếng Việt](./README_VI.md) · [Français](./README_FR.md) · [Deutsch](./README_DE.md) · [Русский](./README_RU.md) · [Bahasa Indonesia](./README_ID.md)

高峰是**北京时间周一至周五 09:00–12:00 和 14:00–18:00**,换成 UTC 是 `01:00-04:00` 和 `06:00-10:00`;其余全部时间是空闲时段,价格减半。2026-08-23 起周末整天都是空闲时段,而这个周末是按北京时间划的:它从 **周五 16:00 UTC 一直到周日 16:00 UTC**,不是 UTC 的零点到零点。本仓库是把这些边界钉住的一张带日期的测试表,外加一份约三十行的参考实现。

**现在是高峰还是空闲?** [这一页当场算给你看](https://xyzs996.github.io/llm-api-pricing/deepseek-peak-hours.html) —— 它在你浏览器里解这套钟点,把星期和周末那条规则一起算进去,告诉你此刻落在哪一档、还有多久换档。不用注册,不用装东西。

**九个已发布的 DeepSeek 计费插件,用这张表跑了一遍:两个全过。** 零依赖,Node 16+;每份判峰函数按 commit 抄在 `conformance/adapters.mjs` 里,抄错了是我的账,说一声我改了重跑。

```
git clone https://github.com/xyzs996/deepseek-peak-hours && cd deepseek-peak-hours
node conformance/run.mjs --detail
```

## 价格(美元/百万 tokens,空闲 / 高峰)

| 模型 | 输入·缓存命中 | 输入·缓存未命中 | 输出 |
| --- | ---: | ---: | ---: |
| `deepseek-v4-flash` | 0.007 / 0.014 | 0.22 / 0.44 | 0.66 / 1.32 |
| `deepseek-v4-flash-vision-exp` | 0.007 / 0.014 | 0.22 / 0.44 | 0.66 / 1.32 |
| `deepseek-v4-pro` | 0.022 / 0.044 | 0.66 / 1.32 | 1.98 / 3.96 |

读于 2026-08-23,出处 <https://api-docs.deepseek.com/quick_start/pricing/>。价会变,以官网为准。

## 厂商两版页面的原话

> **EN** — Off-peak rates are half of the peak rates. Peak hours are 01:00 - 04:00 and 06:00 - 10:00 UTC, Monday through Friday (all other hours are off-peak).

> **ZH** — 空闲时段价格为高峰时段价格的一半。高峰时段为北京时间周一至周五 9:00 - 12:00、14:00 - 18:00（其余为空闲时段）。

两段引文保留原文:它们是证据,翻译过来就不再是原话了。两边的钟点一致 —— 北京时间 09:00–12:00、14:00–18:00 就是 UTC 01:00–04:00、06:00–10:00;但日历不一致。中文那句把「周一至周五」放在北京时间下,英文那句把 `UTC` 贴在钟点上、让 `Monday through Friday` 悬空,读起来像 UTC 的工作日。两种读法只在每周五和周日的 16:00–24:00 UTC 分岔,一周十六个小时。本仓库跟中文那句走。

## 三种会出错的地方,第三种看不见

**1. 追溯。** 计价函数会拿历史时间戳来调 —— 账本重放、用量重算、历史成本看板。把周末折扣无条件套上去,规则生效之前的每一笔周末账单都会被悄悄砍半。折扣必须挂在生效时刻上;做倒计时的话,这道闸要挂在**被判定的那个时刻**上,不是「此刻」。

**2. 倒计时停在周末里面。** 周末里每一条窗口边界的两侧都是空闲时段,所以「走到下一条边界」的倒计时会归零而什么都没变。北京时间周五 18:30 之后,下一次真正的变化是周一 09:00,约 63 小时 —— 长到有些界面的字符串会溢出。

**3. 星期读错了日历,而且拿现行时段写的测试一条都红不了。** 北京时间的周末是从**周五 16:00 UTC 到周日 16:00 UTC**。两种日历只在 16:00–24:00 UTC 分岔,而 DeepSeek 两个高峰窗口都躲开了这一段。所以一份直接拿未换算时刻取星期的实现,能通过你照着官方时段写出来的每一条向量,等到哪天厂商把窗口挪过 16:00 UTC 才开始撒谎。

## 钉住日历那根轴的两个时刻

`2026-08-28T16:30:00Z` 和 `2026-08-30T16:30:00Z`。表里还带一份**明确标注为合成**的时段,它的高峰窗口盖住 16:00–22:00 UTC —— 它不是真实厂商时段,也不作真实时段用;这是唯一能把日历这根轴钉住的办法。顺带:要是你的计价代码不是按时段参数化的,这根轴根本无从测起,这件事本身就值得知道。

## 怎么用

要么把 `phase_at` 移植过去 —— 三十来行没什么花样,时段本身是数据;要么完全不管那份 Python,把 `vectors` 数组贴进你项目里跑表驱动测试的地方。每一条是一个 UTC 时刻、它对应的北京时间挂钟、期望的档位,和一句「这条在分辨什么」。

```
python3 check_vectors.py     # 18/18 passed
```

## 别处

- 同一条规则的散文版,两版厂商原话并排、价格每天重读一遍: <https://xyzs996.github.io/llm-api-pricing/deepseek-peak-hours.html> · [telegra.ph](https://telegra.ph/DeepSeek-peak-and-off-peak-hours-08-23)
- 把这些规则套到真实账单上的计算器 —— 选模型、填 token 结构,它告诉你此刻在价目表的哪一侧、等一等值多少钱: <https://xyzs996.github.io/llm-cost-calculator/>
- 完整英文版自述(含逐条向量、变异测试对照表,以及那份 19 个实现的抽样): <https://github.com/xyzs996/deepseek-peak-hours/blob/main/README.md>
