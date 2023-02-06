const fs = require("fs").promises;
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");

// If modifying these scopes, delete token.json.
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listLabels(auth) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.labels.list({
    userId: "me",
  });
  const labels = res.data.labels;
  if (!labels || labels.length === 0) {
    console.log("No labels found.");
    return;
  }
  console.log("Labels:");
  labels.forEach((label) => {
    console.log(`- ${label.name} : ${label.id}`);
  });
}

async function findMessages(auth) {
  var gmail = google.gmail("v1");
  gmail.users.messages.list(
    {
      auth: auth,
      userId: "me",
      maxResults: 5,
      q: "phangiaphat982015@gmail.com",
      labelIds: ["Label_1320002467154590247"],
    },
    function (err, response) {
      printMessage(response.data.messages, auth);
      console.log("++++++++++++++++++++++++++");
    }
  );
}

async function printMessage(messageID, auth) {
  var gmail = google.gmail("v1");
  gmail.users.messages.get(
    {
      auth: auth,
      userId: "me",
      id: messageID[0].id,
    },

    function (err, response) {
      console.log(response["data"].snippet);
      messageID.splice(0, 1);

      if (messageID.length > 0) {
        printMessage(messageID, auth);
      } else {
        console.log("---All Done---");
      }
    }
  );
  //   gmail.users.messages.batchModify({
  //     auth: auth,
  //     userId: "me",
  //     ids: [messageID["id"]],
  //     removeLabelIds: ["Label_1320002467154590247"],
  //   });
}

authorize().then(findMessages).catch(console.error);
// authorize().then(setInterval(findMessages, 5000)).catch(console.error);
