const request = require("supertest");
const app = require("../src/app");

describe("Application API", () => {

    test("homepage shows calculator", async () => {
        const response = await request(app).get("/");
        expect(response.statusCode).toBe(200);
        expect(response.text).toContain("Jenkins Calculator");
    });

    test("multiply endpoint calculates correctly", async () => {
        const response = await request(app).get("/api/multiply?a=6&b=7");
        expect(response.statusCode).toBe(200);
        expect(response.body.result).toBe(42);
    });

    test.each(["a=&b=2", "b=2", "a=1&a=2&b=3", "a=Infinity&b=2"])(
        "rejects malformed operands: %s", async query => {
            expect((await request(app).get(`/api/add?${query}`)).statusCode).toBe(400);
        }
    );

    test("supports decimals and negative numbers", async () => {
        const response = await request(app).get("/api/add?a=-2.5&b=1");
        expect(response.body.result).toBe(-1.5);
    });

    test("health endpoint returns UP", async () => {
        const response = await request(app)
            .get("/health");

        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe("UP");
    });

    test("add endpoint calculates correctly", async () => {
        const response = await request(app)
            .get("/api/add?a=20&b=22");

        expect(response.statusCode).toBe(200);
        expect(response.body.result).toBe(42);
    });

    test("add endpoint rejects invalid input", async () => {
        const response = await request(app)
            .get("/api/add?a=hello&b=10");

        expect(response.statusCode).toBe(400);
    });

});
