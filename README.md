# Secret Santa

<img align="right" height="160" src="https://user-images.githubusercontent.com/1037931/87014534-92e21280-c1cc-11ea-9675-5f2c0f3c287f.png"/>

Check it live on [mael.dev/secretsanta/](https://mael.dev/secretsanta/) 🎄

Should you appreciate this tool so much that you'd like to thank me, you can either drop a friendly note in this repository's issues, or be a [one-time sponsor](https://github.com/sponsors/arcanis?frequency=one-time&sponsor=arcanis). Either would make my day 😊

<br/>

## Emailing assignments from Gmail

Besides sharing secret links, the organizer can add an email address for each participant and send everyone their assignment directly from their own Gmail account. It all runs in the browser: Google gives the page a short-lived token limited to the `gmail.send` scope (it can send mail but not read the inbox), and the page calls the Gmail API with it.

Emails can be entered in the form view, or in the text view with angle brackets, in any order with the hint:

```
Alice <alice@example.com> (likes cats) !Bob
Bob <bob@example.com>
```

### Setting up a Google OAuth client

1. In the [Google Cloud Console](https://console.cloud.google.com/), create a project and enable the **Gmail API**.
2. Configure the **OAuth consent screen** (External is fine) and add the `https://www.googleapis.com/auth/gmail.send` scope. While the app is in *Testing* mode, add your own Google account as a test user; Google will show an "unverified app" warning you can click through.
3. Create an **OAuth client ID** of type *Web application*, and add the origin the app is served from (e.g. `http://localhost:5173` and/or `https://<you>.github.io`) as an **Authorized JavaScript origin**.
4. Either paste the client ID in the app's **Settings** section (stored in your browser only), or bake it into the build with the `VITE_GOOGLE_CLIENT_ID` environment variable.

Note that a copy of each email lands in the organizer's *Sent* folder.

## Festive modes

The mode picker in the side menu (under the menu links) changes the colors, postcard badges and floating decorations: Classic, Hanukkah, Diwali, Christmas, Eid, Vesak, Nowruz, Rastafari, Pastafarian, and a deliberately joyless Atheist mode with no animations at all. The choice is stored in the browser; decorations are hidden for people who have turned on *reduce motion* in their system settings.

## Mac app

`macos/` contains a native macOS wrapper (Swift + WKWebView) that bundles the web UI, so it works offline and signs in to Gmail natively instead of with a browser popup.

1. Build it with `macos/build.sh` (needs Xcode command line tools and Node). This writes `macos/build/Secret Santa.app`. Secret links the app generates point to `https://bens27.github.io/secretsanta`; set `VITE_PUBLIC_URL` to change that.
2. To send emails, create a second OAuth client ID in the Google Cloud Console, of type **iOS** (Google's type for native Apple apps) with bundle ID `com.bens27.secretsanta`. Paste its client ID in the app's **Settings**. The web client ID from above won't work in the app.

The app is ad-hoc signed, so it's for running on the machine that built it. Sharing it with others would need a Developer ID certificate and notarization.

## License (MIT)

> **Copyright © 2015 Maël Nison**
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
