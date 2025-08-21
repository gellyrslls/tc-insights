<div align="center">

  <h1>TC Insights</h1>

  <p>
    A web application built for Today's Carolinian to automate the process of collecting, scoring, and analyzing social media post performance.
  </p>

  <p>
    <img src="https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js"/>
    <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase"/>
    <img src="https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS"/>
    <img src="https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel"/>
  </p>
</div>

## About The Project

This project was developed to solve a real-world data aggregation and analysis challenge faced by the publication's Online Managers (OMs). It replaces a time-consuming manual workflow by providing a centralized dashboard to view performance data from both **Facebook** and **Instagram**.

The application handles everything from fetching data via the Meta Graph API to scoring posts using a percentile-based algorithm and providing a UI for OMs to add their qualitative analysis, which facilitates the creation of data-driven, bi-monthly reports.


## Key Features

*   **Secure Authentication**: Google OAuth restricted to authorized `@usc.edu.ph` accounts with an additional email whitelist check.
*   **Dynamic Dashboard**: A central dashboard to view ranked social media posts based on a weighted, percentile-based composite score.
*   **Advanced Filtering**: Filter posts by platform, time periods (Last 7 Days, etc.), or a custom date range picker.
*   **One-Click Data Refresh**: A user-triggered backend process that fetches the latest post data and metrics from the Meta Graph API.
*   **Qualitative Analysis**: A feature for users to add, view, and version their written analysis (insights) for any post.


## Tech Stack

*   **Framework**: [Next.js](https://nextjs.org/)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Backend & DB**: [Supabase](https://supabase.io/) (Auth, Postgres, Serverless Functions)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Deployment**: [Vercel](https://vercel.com/)


## Getting Started

To get a local copy up and running, follow these steps.

### Prerequisites

You will need an account and credentials for the following services:
*   [Supabase](https://supabase.io) (for database, auth, and API keys)
*   [Meta for Developers](https://developers.facebook.com/) (for a Page Access Token and Page ID)

### Installation

1.  Clone the repository:
    ```sh
    # Clones the project to your local machine
    git clone https://github.com/gellyrslls/tc-insights.git
    ```
2.  Navigate to the web app directory:
    ```sh
    # Enters the main application folder
    cd tc-insights/apps/web
    ```
3.  Install project dependencies:
    ```sh
    # Installs all necessary packages
    pnpm install
    ```
4.  Set up your environment variables.
    > [!NOTE]
    > Create a new file named `.env.local` by making a copy of `.env.local.example`. Then, fill in your secret keys from Supabase and Meta.

    ```sh
    # Creates your local environment file
    cp .env.local.example .env.local
    ```

5.  Run the development server:
    ```sh
    pnpm dev
    ```
    The application will be available at [http://localhost:3000](http://localhost:3000).


## License

Distributed under the MIT License. See `LICENSE` for more information.

