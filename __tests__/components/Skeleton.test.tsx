import React from "react";
import { render, screen } from "@testing-library/react-native";
import {
  Skeleton,
  SkeletonBalanceCard,
  SkeletonActivityItem,
  SkeletonGroupItem,
  SkeletonList,
} from "@/components/ui/skeleton";

describe("Skeleton", () => {
  it("renders with default props", () => {
    const { toJSON } = render(<Skeleton />);
    expect(toJSON()).not.toBeNull();
  });

  it("renders with custom dimensions", () => {
    const { toJSON } = render(<Skeleton width={200} height={24} borderRadius={4} />);
    expect(toJSON()).not.toBeNull();
  });

  it("accepts custom style prop", () => {
    const { toJSON } = render(<Skeleton style={{ marginTop: 10 }} />);
    expect(toJSON()).not.toBeNull();
  });
});

describe("SkeletonBalanceCard", () => {
  it("renders without crashing", () => {
    const { toJSON } = render(<SkeletonBalanceCard />);
    expect(toJSON()).not.toBeNull();
  });
});

describe("SkeletonActivityItem", () => {
  it("renders without crashing", () => {
    const { toJSON } = render(<SkeletonActivityItem />);
    expect(toJSON()).not.toBeNull();
  });
});

describe("SkeletonGroupItem", () => {
  it("renders without crashing", () => {
    const { toJSON } = render(<SkeletonGroupItem />);
    expect(toJSON()).not.toBeNull();
  });
});

describe("SkeletonList", () => {
  it("renders activity skeleton list with default count", () => {
    const { toJSON } = render(<SkeletonList />);
    expect(toJSON()).not.toBeNull();
  });

  it("renders group skeleton list", () => {
    const { toJSON } = render(<SkeletonList type="group" count={3} />);
    expect(toJSON()).not.toBeNull();
  });

  it("renders with custom count", () => {
    const { toJSON } = render(<SkeletonList count={2} />);
    expect(toJSON()).not.toBeNull();
  });
});
