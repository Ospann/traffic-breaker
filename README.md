# Traffic Breaker

3D endless runner для веб-порталов (Playgama, CrazyGames и др.), в первую очередь для мобильных браузеров. Three.js + TypeScript + Vite, платформенный слой из шаблона game-template ([Playgama Bridge](https://github.com/playgama/bridge)).

ТЗ: [docs/TASK.md](docs/TASK.md). Спорные решения: [docs/design-notes.md](docs/design-notes.md).

## Стек

| Что                | Версия                                               |
| ------------------ | ---------------------------------------------------- |
| Three.js           | 0.187, рендер и игровой цикл; UI — DOM поверх canvas |
| Playgama Bridge    | 2.4.2, подключается локальным файлом из npm, без CDN |
| TypeScript         | 7, `strict`                                          |
| Vite / Vitest      | 8 / 4                                                |
| Линтер / форматтер | oxlint / oxfmt                                       |
| Пакетный менеджер  | pnpm 12, Node 24 (`.nvmrc`)                          |

## Разработка

```sh
pnpm dev            # dev-сервер, платформа mock
pnpm test           # тесты (vitest)
pnpm lint           # oxlint
pnpm format         # oxfmt
pnpm typecheck      # tsc --noEmit
```

В dev используется mock-платформа:

- реклама — оверлей с таймером 2,5 с и кнопкой Skip/Close; rewarded, закрытый раньше таймера, награду не даёт;
- сохранения в `localStorage` с префиксом `mock:`;
- язык из `navigator.language`, можно переопределить через `?lang=ru`;
- в консоли видны все вызовы платформы (`[platform:mock] …`);
- в консоли доступны `__game` и `__platform`, например `__platform.simulatePause()`.

Проверить Bridge локально: `VITE_PLATFORM=bridge pnpm dev`. Вне портала Bridge сам подставляет свою mock-платформу.

## Сборка и релиз

```sh
pnpm build                          # dist/, платформа bridge
pnpm build:zip                      # release/<name>-<version>.zip
pnpm build:zip --platform=mock      # release/<name>-<version>-mock.zip (для демо без SDK)
VITE_PLATFORM=mock pnpm build:zip   # то же через env
```

- `base: './'` — игра работает из любой папки и в iframe.
- `index.html` лежит в корне архива. Для bridge-сборки скрипт проверяет, что в архиве есть `playgama-bridge.js` и `playgama-bridge-config.json`.
- Скрипт печатает размер архива и предупреждает, если он больше 20 МБ.

**Один архив на все площадки.** По документации Bridge определяет площадку в рантайме, и для обычного JS не нужны отдельный `index.html`, свои script-теги или отдельный конфиг. Различия между площадками задаются внутри одного `public/playgama-bridge-config.json` в секции `platforms.<platform_id>` (например, `game_distribution.gameId`). Редактор конфига: https://playgama.github.io/bridge-config-editor/.

Перед отправкой на модерацию пройдите [чеклист](docs/moderation-checklist.md).

**Релиз:**

1. Поднять `version` в `package.json` и закоммитить.
2. Создать и запушить тег `v<version>` (например, `v1.2.3`).
3. GitHub Actions соберёт zip и создаст GitHub Release с архивом. Тег должен совпадать с версией в `package.json`, иначе workflow упадёт.

На каждый push и PR CI запускает install, lint, format:check, typecheck, test и build.

## Структура

```
src/
  core/            платформенный слой и общие сервисы, ничего не знает об игре
  game/
    app/           App и state machine: boot, preload, menu, run, pause, game-over, garage
    engine/        Stage (canvas + DOM-слой, DPR ≤ 2), фиксированный шаг 1/120, камера, автокачество
    input/         распознавание свайпов, буфер ввода 150 мс, клавиатура
    sim/           логика забега без three: движение, тяга, дрон, столкновения
    world/         трасса из паттернов, пулы объектов
    patterns/      паттерны трассы в JSON (data/) и их схема
    view/          отображение симуляции в Three.js
    art/           генераторы low-poly моделей в коде (заменяемы на glTF)
    audio/         движок Web Audio, MuteController применяется к нему
    ui/            экраны на DOM, у каждого свой index.module.css
    balance.ts     скорость, тайминги, высоты препятствий
  i18n/            en.json (эталон ключей), ru.json, tr.json
tests/             Vitest
```

`?debug=1` — оверлей с fps, draw calls и треугольниками; клавиша F заполняет тягу.

`?debug=1&pattern=<id>` — гонять по кругу один паттерн из `src/game/patterns/data/`.

Новый паттерн: добавить JSON в `src/game/patterns/data/` и прогнать `pnpm test` — валидатор проверит проходимость самого паттерна и всех стыков с остальными на скоростях 15, 24 и 32 м/с.

### Границы импортов

- Игровой код импортирует core только через алиас `@core/*`.
- `src/core` не может импортировать `src/game` и словари `src/i18n`.

Оба правила проверяет oxlint (`no-restricted-imports` в `.oxlintrc.json`).

## Платформенный слой

`VITE_PLATFORM`: `mock` | `bridge`. По умолчанию `mock` в dev и `bridge` в production-сборке. Значение подставляется при сборке, поэтому код второго адаптера в архив не попадает.

| Метод `Platform`                     | mock                                 | Bridge                                                   |
| ------------------------------------ | ------------------------------------ | -------------------------------------------------------- |
| `init()`                             | —                                    | `bridge.initialize()`                                    |
| `gameReady()`                        | лог                                  | `game_ready`                                             |
| `gameplayStart()` / `gameplayStop()` | лог                                  | `gameplay_started` / `gameplay_stopped`                  |
| `levelStart/Complete/Fail()`         | лог                                  | `level_started` / `level_completed` / `level_failed`     |
| `showInterstitial()`                 | оверлей                              | `advertisement.showInterstitial`, ждёт `closed`/`failed` |
| `showRewarded()`                     | оверлей, `true` только после таймера | `true` только при состоянии `rewarded`                   |
| `storage.get/set`                    | `localStorage`                       | `bridge.storage`                                         |
| `getLanguage()`                      | `navigator.language` / `?lang=`      | `bridge.platform.language`                               |
| `onPause/onResume`                   | `simulatePause()`                    | `PAUSE_STATE_CHANGED`                                    |
| `isAudioEnabled/onAudioChange`       | всегда вкл                           | `AUDIO_STATE_CHANGED`                                    |

### Сохранения

Схема описывается в `src/game/save.ts`. При изменении структуры поднимите `version` и добавьте миграцию с ключом новой версии:

```ts
migrations: {
  2: (data) => ({ ...data, bestScore: data.highScore ?? 0 }),
  3: (data) => ({ ...data, coins: 0 }),
},
```

- Сохранение старой версии прогоняется по всем шагам и сразу перезаписывается в новой.
- Недостающие поля берутся из `defaults()`.
- Битый JSON заменяется дефолтами.
- Сохранение от более новой версии игры не перезаписывается.
- Запись идёт с debounce 500 мс. При скрытии вкладки и `pagehide` сохранение сбрасывается сразу.

### Реклама

`AdsManager`:

- interstitial не раньше первого завершённого уровня и не чаще раза в `ads.interstitialCooldownSec` секунд (по умолчанию 60);
- rewarded без ограничений;
- если геймплей шёл, на время рекламы вызывается `gameplayStop`, после — `gameplayStart`, а звук выключается.

У Bridge есть свой лимит `minimumDelayBetweenInterstitial` в `playgama-bridge-config.json`. Слишком ранний показ Bridge отклоняет (состояние `failed`), игра в этом случае просто продолжается.

## Добавить язык

1. Создать `src/i18n/<код>.json` с теми же ключами, что в `en.json`. Тест проверяет, что ключи совпадают, поэтому его нужно дополнить.
2. Подключить словарь в `src/i18n/index.ts` (`Language` и `dictionaries`).
3. Добавить ключ `language.<код>` во все словари.
