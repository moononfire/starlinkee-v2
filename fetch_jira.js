const email = "vikbobinski@gmail.com";
const token = process.env.JIRA_API_TOKEN || "";
const auth = Buffer.from(`${email}:${token}`).toString('base64');

fetch("https://vikbobinski.atlassian.net/rest/api/3/issue/10081/transitions", {
    method: "POST",
    headers: {
        "Authorization": `Basic ${auth}`,
        "Accept": "application/json",
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        transition: {
            id: "41"
        }
    })
})
.then(res => {
    if (res.ok) console.log("Issue 10081 transitioned to Gotowe.");
    else console.error("Failed to transition issue", res.status);
})
.catch(console.error);
