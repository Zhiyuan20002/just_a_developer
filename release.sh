#!/usr/bin/env bash
set -euo pipefail

version="${1:-}"
if [[ -z "$version" ]]; then
  echo "用法: ./release.sh <version>"
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "缺少 gh CLI，请先安装并登录。"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "工作区不干净，请先提交或清理改动。"
  exit 1
fi

tag="v${version}"
if git tag -l "$tag" | grep -q .; then
  echo "标签 ${tag} 已存在。"
  exit 1
fi

echo "检查 CHANGELOG 是否包含 ${version}"
if ! grep -q "^## ${version}$" CHANGELOG.md; then
  echo "CHANGELOG.md 缺少 ## ${version} 段落，请先补充。"
  exit 1
fi

echo "更新版本号为 ${version}"
npm version "$version" --no-git-tag-version

echo "创建并推送标签 ${tag}"
git tag "$tag"
git push origin "$tag"

echo "已推送 ${tag}，GitHub Actions 将自动构建并发布。"
