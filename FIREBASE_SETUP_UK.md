# Підключення Google входу і бази даних

## 1. Firebase project

1. Відкрий Firebase Console.
2. Створи project.
3. Натисни Web app `</>`.
4. Скопіюй firebaseConfig.
5. Встав його у файл:

```js
js/config/firebase.config.js
```

## 2. Authentication

1. Firebase Console → Authentication → Sign-in method.
2. Увімкни Google provider.
3. Додай Authorized domains:
   - `localhost`
   - `lwowsky.uk`
   - `vovapotaychuk.github.io` або твій GitHub Pages домен, якщо треба.

## 3. Firestore Database

1. Firebase Console → Firestore Database → Create database.
2. Почни з production mode.
3. Rules → встав правила з файлу:

```txt
firebase/firestore.rules
```

## 4. Що зберігається

Після Google входу сайт створює або оновлює документ:

```txt
users/{google_uid}
```

Поля:

- `uid`
- `displayName`
- `email`
- `photoURL`
- `providerId`
- `role`
- `gameProfile`
- `createdAt`
- `updatedAt`
- `lastLoginAt`

## 5. Як краще зберігати майбутню форму реєстрації

Рекомендована структура:

```txt
users/{uid}
regions/{regionNumber}/players/{uid}
regions/{regionNumber}/plans/{planId}
```

Так буде легше робити фільтр по регіонах 1–1200+, права доступу і майбутню адмінку.
