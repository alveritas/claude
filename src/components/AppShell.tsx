"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { IntroLoader, Toast } from "@/components/layout/Ambient";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { QuickView } from "@/components/layout/QuickView";
import { SearchOverlay } from "@/components/layout/SearchOverlay";
import { CartProvider } from "@/components/providers/CartProvider";
import { StoreProvider, type StoreValue } from "@/components/providers/StoreProvider";
import { UIProvider } from "@/components/providers/UIProvider";
import { WishlistProvider } from "@/components/providers/WishlistProvider";

function Main({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The homepage hero sits under the transparent header; every other page clears it.
  return (
    <main id="main" tabIndex={-1} className={`${pathname === "/" ? "" : "main-offset"} outline-none`}>
      <div key={pathname} className="page-enter">
        {children}
      </div>
    </main>
  );
}

export function AppShell({ store, children }: { store: StoreValue; children: ReactNode }) {
  return (
    <StoreProvider value={store}>
      <UIProvider>
        <CartProvider>
          <WishlistProvider>
            <IntroLoader />
            <Header />
            <Main>{children}</Main>
            <Footer />
            <MobileMenu />
            <SearchOverlay />
            <CartDrawer />
            <QuickView />
            <Toast />
          </WishlistProvider>
        </CartProvider>
      </UIProvider>
    </StoreProvider>
  );
}
