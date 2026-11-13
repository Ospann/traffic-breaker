# game-template

Шаблон HTML5-игры на Phaser 4 + TypeScript + Vite для публикации на веб-порталах (Playgama, CrazyGames, Яндекс Игры и другие) через [Playgama Bridge](https://github.com/playgama/bridge).

## Стек

| Что                | Версия                                                                 |
| ------------------ | ---------------------------------------------------------------------- |
| Phaser             | 4.2.1 (Matter.js и Arcade встроены, включаются в `src/game/config.ts`) |
| Playgama Bridge    | 2.4.2, подключается локальным файлом из npm, без CDN                   |
| TypeScript         | 7, `strict`                                                            |
| Vite / Vitest      | 8 / 4                                                                  |
| Линтер / форматтер | oxlint / oxfmt                                                         |
| Пакетный менеджер  | pnpm 12, Node 24 (`.nvmrc`)                                            |

## Создать новую игру из шаблона

1. На GitHub: **Use this template → Create a new repository** (в настройках этого репозитория должна стоять галочка _Template repository_).
2. Склонировать новый репозиторий и поставить зависимости:
   ```sh
   corepack enable
   pnpm install
   ```
3. Переименовать игру:
   - `package.json` → `name` (из него берётся имя архива) и `version`;
   - `src/game/config.ts` → `id` (префикс ключа сохранения), ориентация, разрешение, физика, длительность уровня, кулдаун рекламы;
   - `index.html` → `<title>`;
   - `src/i18n/*.json` → `menu.title`.
4. Заменить демо-механику в `src/game/scenes/game.ts` и ассеты в `public/assets/`.

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
    platform/      интерфейс Platform, адаптеры mock и bridge
    save/          SaveManager: версия схемы, миграции, debounce, fallback на localStorage
    ads/           AdsManager: частота interstitial, gameplay stop/start вокруг рекламы
    i18n/          I18n: t(key, params), fallback на en
    input.ts       блокировка контекстного меню, скролла, pinch-zoom, выделения
    pause.ts       пауза по событию платформы и visibilitychange
    audio.ts       MuteController: звук выключен, если есть хоть одна причина
    gameplay.ts    GameplayTracker: не шлёт повторных start/stop
  game/            код конкретной игры
    config.ts      ориентация, разрешение, физика, параметры уровня и рекламы
    save.ts        схема сохранения и миграции
    scenes/        Boot, Preload, Menu, Game, Pause, GameOver
  i18n/            en.json (эталон ключей), ru.json, tr.json
public/            ассеты и playgama-bridge-config.json
scripts/           build-zip.ts
tests/             тесты SaveManager, AdsManager, I18n
```

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
