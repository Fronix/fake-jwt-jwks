const fs = require("fs");
const express = require("express");
const app = express();
const port = 3000 || process.env.PORT;
const jose = require("node-jose");
const ms = require("ms");

const keyStore = jose.JWK.createKeyStore();

const htmlString = `
<!DOCTYPE html>
<html>
  <head>
    <title>Fake JWT</title>
  </head>
  <body>
      <h1>This is a fake JWT and JWKS app</h1>
      <h2>Endpoints:</h2>
      <ul>
        <li>/jwks <i>GET</i></li>
        <li>/tokens <i>POST</i>
        <cite style="display: block;">You can send your own JWT data as json for extra faking</cite>
        <p>Example:</p>
        <code>
        curl -X POST https://fake-jwt.fronix.io \\
         -H "Content-Type: application/json" \\
         -d '{
               "somedata": "blabala",
               "userid": 1234,
               "group": "admin, developer"
             }'
        </code>
        </li>
      </ul>
  </body>
</html>
`;

keyStore.generate("RSA", 2048, { alg: "RS256", use: "sig" }).then((result) => {
  fs.writeFileSync(
    "Keys.json",
    JSON.stringify(keyStore.toJSON(true), null, "  ")
  );
});

app.use(express.json());
app.get("/", async (req, res) => {
  res.send(htmlString);
});

app.get("/jwks", async (req, res) => {
  const ks = fs.readFileSync("Keys.json");

  const keyStore = await jose.JWK.asKeyStore(ks.toString());

  res.send(keyStore.toJSON());
});

app.post("/tokens", async (req, res) => {
  const incPayload = req.body;

  const JWKeys = fs.readFileSync("Keys.json");

  const keyStore = await jose.JWK.asKeyStore(JWKeys.toString());

  const [key] = keyStore.all({ use: "sig" });

  const opt = { compact: true, jwk: key, fields: { typ: "jwt" } };

  const payload = JSON.stringify({
    ...incPayload,
    issuer: "https://testing.com",
    exp: Math.floor((Date.now() + ms("100d")) / 1000),
    iat: Math.floor(Date.now() / 1000),
  });

  const token = await jose.JWS.createSign(opt, key).update(payload).final();
  res.send({ token });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
