"use client";

import { Box, Card, Skeleton, useMediaQuery } from "@mui/material";

/** Reserve the final layout while data arrives, respecting reduced-motion settings. */
export function DashboardLoading() {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const animation = reducedMotion ? false : "wave";
  return (
    <Box
      role="status"
      aria-label="Loading dashboard"
      aria-busy
      sx={{ display: "grid", gap: 2.5 }}
    >
      <Skeleton animation={animation} width="45%" height={48} />
      <Skeleton animation={animation} width="65%" height={20} />
      <Skeleton
        animation={animation}
        variant="rounded"
        height={280}
        sx={{ borderRadius: 4 }}
      />
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "repeat(2, 1fr)", lg: "repeat(5, 1fr)" },
        }}
      >
        {Array.from({ length: 5 }, (_, index) => (
          <Card key={index} sx={{ p: 2 }}>
            <Skeleton
              animation={animation}
              variant="circular"
              width={44}
              height={44}
            />
            <Skeleton animation={animation} height={18} sx={{ mt: 1 }} />
            <Skeleton animation={animation} width="60%" height={32} />
            <Skeleton animation={animation} height={36} />
          </Card>
        ))}
      </Box>
      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0,7fr) minmax(0,5fr)" },
        }}
      >
        {[0, 1].map((column) => (
          <Box key={column} sx={{ minWidth: 0 }}>
            <Skeleton
              animation={animation}
              width="55%"
              height={36}
              sx={{ mb: 2 }}
            />
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: column === 0 ? "1fr 1fr" : "1fr",
              }}
            >
              {[0, 1].map((card) => (
                <Card key={card} sx={{ p: 1.5 }}>
                  <Skeleton animation={animation} height={24} width="65%" />
                  <Skeleton
                    animation={animation}
                    variant="rounded"
                    height={195}
                  />
                  <Skeleton animation={animation} height={32} width="75%" />
                </Card>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
      <Skeleton animation={animation} variant="rounded" height={220} />
    </Box>
  );
}
