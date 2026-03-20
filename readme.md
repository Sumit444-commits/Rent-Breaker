<h1 align="center">Rent-Breaker</h1>

<p align="center">
  <strong>A comprehensive Machine Management & Rental System designed for high-efficiency asset tracking, automated billing, and maintenance scheduling.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/github/license/Sumit444-commits/Rent-Breaker?style=flat-square&color=5D5DFF" alt="License">
  <img src="https://img.shields.io/github/stars/Sumit444-commits/Rent-Breaker?style=flat-square&color=5D5DFF" alt="Stars">
  <img src="https://img.shields.io/github/last-commit/Sumit444-commits/Rent-Breaker?style=flat-square&color=5D5DFF" alt="Last Commit">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome">
</p>

<p align="center">
  <a href="#-key-features">Features</a> •
  <a href="#-technology-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="https://rent-breaker-backend.vercel.app">Live Demo</a>
</p>

---


## 🚀 Key Features

*   **Role-Based Access Control (RBAC):** Secure authentication system with distinct permissions for `Admin`, `Staff`, and `User` roles using JWT and custom middleware.
*   **Comprehensive Inventory Management:** Full CRUD capabilities for machinery, including status tracking (Available, Rented, Maintenance).
*   **Automated Billing & Invoicing:** Integrated billing engine with `react-to-print` support for generating professional invoices.
*   **Maintenance Scheduling:** Automated task scheduling via `node-cron` to track machine health and preventive maintenance logs.
*   **Advanced Analytics:** Visualized operational data and financial reporting using `Recharts` and dedicated report generation logic.
*   **Responsive UI/UX:** Built with React 19 and Tailwind CSS 4, offering a modern, mobile-first administrative experience.
*   **Real-time Notifications:** Toast-based alerts for critical actions and error handling using `react-hot-toast`.

---

## 🛠 Technology Stack

### Frontend
| Technology | Version | Description |
| :--- | :--- | :--- |
| **React** | ^19.2.4 | Modern UI library with Concurrent Mode support |
| **Vite** | ^7.3.1 | High-performance build tool |
| **Tailwind CSS** | ^4.2.1 | Utility-first CSS framework |
| **React Router** | ^7.13.1 | Client-side routing with nested layouts |
| **Recharts** | ^3.8.0 | Composable charting library for data visualization |

### Backend
| Technology | Version | Description |
| :--- | :--- | :--- |
| **Node.js** | ESM | Server-side JavaScript runtime |
| **Express** | ^4.18.2 | Fast, unopinionated web framework |
| **Mongoose** | ^7.6.3 | Elegant MongoDB object modeling |
| **JWT** | ^9.0.2 | Secure industry-standard token-based auth |
| **Node-Cron** | ^4.2.1 | Background task scheduling for maintenance |

---

## 📂 Directory Structure

```text
.
├── backend/
│   ├── middleware/          # Authentication & Role-based validation logic
│   ├── models/              # Mongoose schemas (User, Machine, Rental, etc.)
│   ├── routes/              # API endpoints organized by resource
│   ├── utils/               # Helper functions and Cron job definitions
│   ├── server.js            # Express application entry point
│   └── package.json         # Backend dependencies & scripts
├── rent-breaker-frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI elements (Layout, Modal, etc.)
│   │   ├── context/         # Global state management (AuthContext)
│   │   ├── pages/           # View components (Dashboard, Billing, etc.)
│   │   ├── utils/           # Axios instance and API abstraction
│   │   ├── App.jsx          # Route definitions & Protected Routes
│   │   └── main.jsx         # React application entry point
│   ├── vite.config.js       # Vite configuration
│   └── package.json         # Frontend dependencies
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB (Atlas or Local instance)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Sumit444-commits/Rent-Breaker.git
   cd Rent-Breaker
   ```

2. **Setup Backend:**
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` directory:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secret_key
   ```
   Start the server:
   ```bash
   npm run dev
   ```

3. **Setup Frontend:**
   ```bash
   cd ../rent-breaker-frontend
   npm install
   ```
   Create a `.env` file in the `rent-breaker-frontend` directory:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
   Start the development server:
   ```bash
   npm run dev
   ```

---

## 👤 Author

**Sumit444-commits**
*   **GitHub:** [@Sumit444-commits](https://github.com/Sumit444-commits)
*   **Portfolio:** [sumitsharma.codes](https://sumitsharma.codes/)

---

Designed with ❤️ [Autome](https://autome.vercel.app)