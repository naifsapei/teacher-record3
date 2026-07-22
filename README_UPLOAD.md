# Teacher Record 2 - Manual Upload Guide

هذا الملف يوضح لك ما الذي يجب رفعه يدويًا إلى GitHub إذا كنت لا تريد استخدام Git مباشرة.

## المجلدات والملفات التي يجب رفعها

رفع جميع المحتويات داخل مجلد المشروع الرئيسي باستثناء ما يلي:

- .git
- node_modules
- dist
- .vite

## المحتوى الأساسي المطلوب

الملفات والمجلدات التالية يجب أن تكون موجودة في المستودع:

- package.json
- package-lock.json
- vite.config.js
- index.html
- postcss.config.js
- tailwind.config.js
- components.json
- eslint.config.js
- jsconfig.json
- public/
- src/
- base44/
- README.md

## ملاحظات مهمة

- هذا المشروع يعتمد على React + Vite.
- بعد رفع المشروع، شغّل الأمر التالي داخل المجلد:

```bash
npm install
npm run dev
```

## إذا كنت تريد رفعه عبر GitHub Desktop أو GitHub Web

1. أنشئ مستودعًا جديدًا باسم Teacher-record2.
2. ارفع مجلد المشروع بالكامل إلى المستودع الجديد.
3. تأكد من استبعاد node_modules وdist و.git.
4. أضف ملف README هذا إذا رغبت.

## الملفات التي تم تعديلها في هذا المشروع

من أبرز الملفات التي أضيفت أو عدلت:

- src/utils/archiveRestore.js
- src/utils/backupImport.js
- src/pages/Archives.jsx
- src/pages/Admin.jsx
- src/App.jsx
- src/components/layout/Sidebar.jsx
- src/pages/TeacherNeeds.jsx
- src/pages/TeacherTests.jsx
- src/pages/TeacherReports.jsx

إذا رغبت، يمكنني أيضًا إعداد ملف .gitignore مناسب للرفع.
