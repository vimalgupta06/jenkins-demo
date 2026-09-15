const express = require("express");
const { add, multiply } = require("./math");

const app = express();

app.get("/", (req, res) => {
    res.type("html").send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Jenkins Calculator</title>
<style>body{font-family:system-ui;max-width:640px;margin:60px auto;padding:20px;background:#f5f7fb;color:#172033}input,button{font:inherit;padding:12px;margin:6px}input{width:180px}button{cursor:pointer}output{display:block;padding:20px;font-size:24px}</style>
</head><body><h1>Jenkins Calculator</h1>
<p>Edit → Push → Test → Build → Deploy</p>
<form id="calculator"><input name="a" type="number" step="any" required placeholder="First number" aria-label="First number">
<input name="b" type="number" step="any" required placeholder="Second number" aria-label="Second number">
<div><button value="add">Add (+)</button><button value="multiply">Multiply (×)</button></div></form>
<output id="result" aria-live="polite">Enter two numbers.</output>
<p id="version"></p><a href="/health">Health check</a>
<script>
document.querySelector('form').addEventListener('submit', async event => {
    event.preventDefault();
    const output = document.querySelector('output');
    try {
        const query = new URLSearchParams(new FormData(event.target));
        const response = await fetch('/api/' + event.submitter.value + '?' + query);
        const data = await response.json();
        output.textContent = response.ok ? 'Result: ' + data.result : data.error;
    } catch { output.textContent = 'Could not reach the server. Try again.'; }
});
fetch('/health').then(response => response.json()).then(data => {
    document.querySelector('#version').textContent = 'Deployed build: ' + data.version;
}).catch(() => {});
</script></body></html>`);
});

// Empty and repeated query parameters should not silently become numbers.
app.use(["/api/add", "/api/multiply"], (req, res, next) => {
    if (![req.query.a, req.query.b].every(value =>
        typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)))) {
        return res.status(400).json({ error: "a and b must be valid numbers" });
    }
    return next();
});

app.get("/health", (req, res) => {
    res.json({
        status: "UP",
        service: "jenkins-node-demo",
        version: process.env.APP_VERSION || "dev"
    });
});

app.get("/api/add", (req, res) => {
    const a = Number(req.query.a);
    const b = Number(req.query.b);

    if (!Number.isFinite(a) || !Number.isFinite(b)) {
        return res.status(400).json({
            error: "a and b must be valid numbers"
        });
    }

    return res.json({
        result: add(a, b)
    });
});

app.get("/api/multiply", (req, res) => {
    const a = Number(req.query.a);
    const b = Number(req.query.b);

    if (!Number.isFinite(a) || !Number.isFinite(b)) {
        return res.status(400).json({
            error: "a and b must be valid numbers"
        });
    }

    return res.json({
        result:  multiply(a, b)
    });
});

module.exports = app;
