# Формочки by Savi

## Использование:

1) Берёте шаблон из exampleForm, сохраняя структуру.
2) выбираете только нужные вам типы инпутов.
3) И подключаете на странице скрипт, где есть строчка:
```
var validator = require('../../lib/forms/forms');

$(function () {
    validator.init();
});
```