"use client";
import Link from "next/link";
import { Box, Button, Card, Typography } from "@mui/material";
import { useApi } from "@/lib/api";
import { PageHeader, ErrorState } from "@/components/ui";
import { rs } from "@/lib/format";
import { WhatsAppPhoneReview } from "@/components/WhatsAppPhoneReview";
type Analytics = {
  referrals: {
    joined: number;
    pending: number;
    completed: number;
    review: number;
    conversion_rate: number;
  };
  loyalty: {
    wallets: number;
    points_issued: number;
    points_redeemed: number;
    outstanding_points: number;
    outstanding_value: number;
  };
  by_benefit: {
    type: string;
    orders: number;
    revenue: number;
    average_order_value: number;
    discount_cost: number;
  }[];
};
export default function MarketingRewards() {
  const { data, error, refresh } = useApi<Analytics>(
    "/api/admin/marketing-analytics",
    true,
  );
  return (
    <Box>
      <PageHeader
        title="Marketing & Rewards"
        subtitle="One checkout benefit per order. Referral attribution stays separate from redemption."
      />
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3 }}>
        <Button component={Link} href="/offers-points" variant="contained">
          Promo Codes & Nourish Rewards
        </Button>
        <Button component={Link} href="/refer-earn" variant="outlined">
          Referral Program & Fraud Review
        </Button>
      </Box>
      {error && <ErrorState message={error} onRetry={refresh} />}
      <WhatsAppPhoneReview />
      {!data && !error && <Typography>Loading marketing analytics…</Typography>}
      {data && (
        <>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              mb: 3,
            }}
          >
            <Card sx={{ p: 3 }}>
              <Typography variant="h6">Referrals</Typography>
              <Typography>
                {data.referrals.joined} joined · {data.referrals.pending}{" "}
                pending · {data.referrals.completed} completed
              </Typography>
              <Typography>
                {data.referrals.conversion_rate}% conversion ·{" "}
                {data.referrals.review} held for review
              </Typography>
            </Card>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6">Nourish Points</Typography>
              <Typography>
                {data.loyalty.wallets} wallets · {data.loyalty.points_issued}{" "}
                issued · {data.loyalty.points_redeemed} redeemed
              </Typography>
              <Typography>
                {data.loyalty.outstanding_points} outstanding points ·{" "}
                {rs(data.loyalty.outstanding_value)} redemption liability at
                current rates
              </Typography>
            </Card>
          </Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Offer comparison
          </Typography>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
            }}
          >
            {data.by_benefit.map((item) => (
              <Card key={item.type} sx={{ p: 3 }}>
                <Typography sx={{ fontWeight: 800 }}>
                  {item.type.replace(/_/g, " ")}
                </Typography>
                <Typography>
                  {item.orders} orders · {rs(item.revenue)} net paid revenue
                </Typography>
                <Typography>
                  {rs(item.average_order_value)} average paid order ·{" "}
                  {rs(item.discount_cost)} discounts
                </Typography>
              </Card>
            ))}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Revenue uses saved paid totals after recorded food refunds.
            Contribution margin and 30/60/90-day retention require cost and
            cohort data and are not estimated here. Product rewards, expiry
            campaigns and tiers belong to later rollout phases.
          </Typography>
        </>
      )}
    </Box>
  );
}
