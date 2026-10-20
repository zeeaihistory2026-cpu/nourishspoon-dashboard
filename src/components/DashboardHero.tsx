"use client";

import Link from "next/link";
import { Box, Button, Card, Typography } from "@mui/material";
import ArrowForwardOutlined from "@mui/icons-material/ArrowForwardOutlined";

/** Keep the headline as accessible text so it stays sharp at every screen size. */
export function DashboardHero() {
  return (
    <Card
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 4,
        minHeight: { xs: 260, sm: 250 },
        aspectRatio: { md: "3.55 / 1" },
        backgroundColor: "#f0e0bb",
      }}
    >
      <Box
        component="img"
        src="/assets/brand/hero-banner.jpg"
        alt="Handcrafted panjeeri, dates, nuts and energy balls"
        sx={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: { xs: "62% center", md: "center" },
        }}
      />
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: {
            xs: "linear-gradient(90deg, #f7edcf 0%, #f7edcfeb 35%, #f7edcf44 68%, transparent 85%)",
            md: "linear-gradient(90deg, #f7edcffa 0%, #f7edcfeb 19%, #f7edcf88 31%, transparent 48%)",
          },
        }}
      />
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          width: { xs: "68%", sm: "48%", md: "39%" },
          p: { xs: 2.5, md: 3 },
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
        }}
      >
        <Box
          component="img"
          src="/assets/brand/logo-transparent.png"
          alt="Nourish Spoon"
          sx={{
            width: { xs: 65, md: 76 },
            height: 40,
            objectFit: "contain",
            mb: 0.8,
          }}
        />
        <Typography
          component="h2"
          sx={{
            fontFamily: "var(--font-display), Georgia, serif",
            color: "#182b1d",
            fontWeight: 700,
            fontSize: { xs: 27, sm: 28, lg: 34, xl: 39 },
            letterSpacing: "-0.04em",
            lineHeight: 1.02,
            textWrap: "balance",
          }}
        >
          Wholesome
          <br />
          Goodness for
          <br />
          Brighter Days
        </Typography>
        <Typography
          sx={{
            fontFamily: "Georgia, serif",
            fontSize: { xs: 10, lg: 12 },
            color: "#53472d",
            mt: 1,
            mb: 1.4,
          }}
        >
          Real Ingredients · Timeless Tradition · Healthier Lives
        </Typography>
        <Button
          component={Link}
          href="/products"
          variant="contained"
          endIcon={<ArrowForwardOutlined />}
          sx={{
            borderRadius: 8,
            border: "1px solid #d6b767",
            px: 2.3,
            py: 0.7,
            fontSize: 12,
          }}
        >
          Craft Goodness
        </Button>
      </Box>
    </Card>
  );
}
