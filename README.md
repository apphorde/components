## API

`POST /build`:

```json
{
    "name": "x-text",
    "html": "<div class=\"text\">{{ text }}</div>",
    "css": ".text { color: blue }",
    "js": "defineProps({ text: String })"
}
```

Response: a Vue 3 custom element
