# _AutoMarketer_ : AI-Powered Content Generator for MSMEs

_AutoMarketer_ is an AI-powered marketing tool built for MSMEs (Micro Small & Medium Enterprises) to maintain a consistent online presence effortlessly. It generates platform-specific content like social media posts, emails, and blogs based on the business’s products, offers, and audience. By integrating real-time trends and AI models, it ensures posts are fresh, relevant, and engaging. The solution includes a user-friendly dashboard with multi-user support, designed for lightweight deployment and demo readiness.

Wanna Try ??

Follow the Installation & SetUp process

# Prerequisites

1. Python 3.8+ installed (for backend).

2. Node.js 14+ and npm installed (for frontend).

3. Gemini API key (Get it for Free from the Google Ai Studio)
# Installation & SetUp

1. First Clone the Repository
```
git clone https://your-github-repo-url/AutoMarketer.git

cd AutoMarketer
```

2. Set Up Backend
```
cd backend

python -m venv venv

venv\Scripts\activate

pip install flask flask-cors google-generativeai sqlite3 requests transformers torch pytrends
```
Add your Gemini Api key in the App.py file

3. Set Up Frontend
```
cd ../frontend

npm install
```
Now, Run the Backend and Frontend in 2 different Terminals

4. Run Backend (Be in backend folder to run this)
```
python app.py
```

5. Run Frontend (Be in frontend folder to run this)
```
npm start
```
If you are the new user register first.
# Features

1. _User Authentication_ : Secure signup and login system with email and password,  supporting multiple MSME organizations.

2. _Product Management_ : Add, view, and delete products with details like name, description, and offers. Products are personal to each user.

3. _AI Content Generation_ : Generate tailored marketing content for platforms like Instagram, LinkedIn, Email, and Blog, using Gemini AI with HuggingFace fallback.

4. Trend Integration: Incorporates real-time market trends and hashtags via Google Trends API (or simulated for reliability) to boost post engagement.

5. _Draft History_: View, expand, and copy past generated drafts, with timestamps and product association, filtered by user.

6. Tabbed Dashboard: Intuitive interface with Home (overview), Products, Generate, and History tabs for easy navigation.

7. Multi-User Support: Data isolation per user — products and history are private to each logged-in account.
# Tech Stack

- Backend : **Flask** (Python) for API endpoints and logic

- DataBase: **SQLite** (products, drafts, users) Tables

- Frontend: **React.js** with Bootstrap for responsive UI, Axios for API calls.

- AI Models: **Google Gemini** with HuggingFace fallback for content generation.

- Trends: PyTrends for Google Trends API integration. 