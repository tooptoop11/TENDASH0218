const SYMBOL = "TTE.PA";

export async function onRequestGet() {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${SYMBOL}?interval=1d&range=5d`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Yahoo Finance returned ${response.status}`);
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      throw new Error("No data from Yahoo Finance");
    }

    const meta = result.meta;
    const currentPrice = Number(meta.regularMarketPrice || 0);
    const previousClose = Number(meta.previousClose || meta.chartPreviousClose || 0);
    const change = currentPrice - previousClose;
    const changePercent = previousClose ? (change / previousClose) * 100 : 0;

    return new Response(
      JSON.stringify({
        symbol: SYMBOL,
        name: "TotalEnergies SE",
        price: currentPrice.toFixed(2),
        previousClose: previousClose.toFixed(2),
        change: change.toFixed(2),
        changePercent: changePercent.toFixed(2),
        currency: meta.currency || "EUR",
        marketState: meta.marketState,
        dayHigh: meta.regularMarketDayHigh?.toFixed(2),
        dayLow: meta.regularMarketDayLow?.toFixed(2),
        volume: meta.regularMarketVolume,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh?.toFixed(2),
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow?.toFixed(2),
        lastUpdate: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=15",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        symbol: SYMBOL,
        name: "TotalEnergies SE",
        price: "60.14",
        previousClose: "61.15",
        change: "-1.01",
        changePercent: "-1.65",
        currency: "EUR",
        marketState: "CLOSED",
        fallback: true,
        error: error?.message || "Stock fetch error",
        lastUpdate: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
