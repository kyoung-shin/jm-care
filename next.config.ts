import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 리포트 PDF 생성에 쓰는 한글 폰트는 코드에서 경로로만 읽으므로
  // 자동 추적이 놓친다. 서버리스 번들에 명시적으로 포함시킨다.
  outputFileTracingIncludes: {
    "/api/students/[id]/reports/pdf": ["./src/server/fonts/**"],
  },
};

export default nextConfig;
