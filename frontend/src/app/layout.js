import { Geist_Mono, Merriweather, Source_Sans_3 } from "next/font/google";
import { Toaster } from "react-hot-toast";
import AuthLayout from "@/components/AuthLayout";
import "./globals.css";

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Timetable Management System",
  description: "A modern timetable management system for educational institutions",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${merriweather.variable} ${sourceSans.variable} ${geistMono.variable} antialiased`}>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#fefcf6",
              color: "#223244",
              border: "1px solid #d9d2c3",
              borderRadius: "12px",
              fontSize: "14px",
              boxShadow: "0 10px 28px rgba(20, 34, 51, 0.15)",
            },
            success: {
              iconTheme: { primary: "#15803d", secondary: "#fefcf6" },
            },
            error: {
              iconTheme: { primary: "#dc2626", secondary: "#fefcf6" },
            },
          }}
        />
        <AuthLayout>{children}</AuthLayout>
      </body>
    </html>
  );
}
