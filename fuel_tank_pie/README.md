# Fuel Tank Pie PILOT Extension

Отдельное расширение PILOT для просмотра машин с топливными датчиками.

## Состав

- `Module.js` - runtime entry point расширения.
- `style.css` - стили панели и fallback-диаграммы.
- `index.html` - корневой статический файл для хостинга.
- `doc/index.html` - документация для пользователя/администратора.

## Регистрация в PILOT

Slug расширения должен быть:

```text
fuel_tank_pie
```

`Module.js` определяет класс:

```text
Store.fuel_tank_pie.Module
```

## Данные

Расширение использует PILOT API:

- `GET /api/v3/vehicles` - список машин и текущие `sensors_status`.
- `GET /api/v3/vehicles/instant-status` - уточнение текущего остатка при выборе машины.

Емкость полного бака не всегда приходит из API V3, поэтому ее можно поправить
в поле "Полный бак"; значение сохраняется в `localStorage` браузера.
