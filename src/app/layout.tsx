import type { Metadata } from "next";
import localFont from "next/font/local";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "@/lib/theme";
import "./globals.css";

const playfair = localFont({
  src: "../fonts/playfairdisplay/PlayfairDisplay[wght].ttf",
  weight: "400 900",
  variable: "--font-display",
  display: "swap",
});

const nunito = localFont({
  src: "../fonts/nunitosans/NunitoSans[YTLC,opsz,wdth,wght].ttf",
  weight: "200 1000",
  variable: "--font-sans",
  display: "swap",
});

const pinyon = localFont({
  src: "../fonts/pinyonscript/PinyonScript-Regular.ttf",
  weight: "400",
  variable: "--font-script",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nourish Spoon — Admin Dashboard",
  description: "Operational and content control for the Nourish Spoon app.",
  icons: { icon: "/assets/brand/logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${nunito.variable} ${pinyon.variable}`}
    >
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
