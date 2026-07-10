# Airport Transportation Management App

[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green.svg)](https://fastapi.tiangolo.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green.svg)](https://www.mongodb.com/cloud/atlas)
[![TypeScript](https://img.shields.io/badge/TypeScript-Latest-blue.svg)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-1FA2B8.svg)](https://tailwindcss.com)

## Overview

A full-stack Airport Transportation Management System designed for coordinating passenger pickup and drop-off services at airports. The system integrates with JotForm for passenger intake, provides real-time flight status updates via FlightAware AeroAPI, and enables drivers (Sarthi) to view their pickup assignments with automated SMS and email notifications.

**Built for**: Religious/community organizations managing airport transportation logistics at scale.

---

## Features

- **Role-Based Access Control** — Super admin, transportation admin, and driver roles with screen-specific UI
- **JotForm Integration** — Automated webhook-driven passenger data ingestion with form submission validation
- **Flight Group Management** — Groups passengers by flight with real-time status (on-time, delayed, cancelled) from FlightAware
- **Sarthi Assignment** — Assign drivers to bookings/flights with automatic SMS + email notifications to passengers
- **Notification Templates** — Editable email and SMS templates with variable substitution (SendGrid + Twilio)
- **Driver Dashboard** — Pickup list view with passenger details, flight info, and trip status tracking
- **Dark/Light Mode** — Theme toggle persisted to localStorage with CSS variable-based dark mode
- **Responsive UI** — Mobile-friendly design with horizontal scroll tabs and Tailwind CSS v4 utilities
- **Health Checks** — MongoDB connectivity status endpoint for deployment monitoring
