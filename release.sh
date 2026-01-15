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
platform=$(uname -s)
arch=$(uname -m)

case "$platform" in
  Darwin)
    build_cmd="npm run build:mac"
    artifact_patterns=("dist/*.dmg" "dist/*-mac.zip")
    ;;
  Linux)
    build_cmd="npm run build:linux"
    artifact_patterns=("dist/*.AppImage" "dist/*.deb" "dist/*.snap")
    ;;
  MINGW*|MSYS*|CYGWIN*)
    build_cmd="npm run build:win"
    artifact_patterns=("dist/*-setup.exe" "dist/*.exe")
    ;;
  *)
    echo "不支持的平台: ${platform} (${arch})"
    exit 1
    ;;
esac

if gh release view "$tag" >/dev/null 2>&1; then
  echo "Release ${tag} 已存在。"
  exit 1
fi

shopt -s nullglob
existing_artifacts=()
for pattern in "${artifact_patterns[@]}"; do
  matches=($pattern)
  if [[ ${#matches[@]} -gt 0 ]]; then
    existing_artifacts+=("${matches[@]}")
  fi
  unset matches
 done

if [[ ${#existing_artifacts[@]} -gt 0 ]]; then
  echo "检测到旧产物，请先清理 dist 目录。"
  exit 1
fi

echo "检查 CHANGELOG 是否包含 ${version}"
if ! grep -q "^## ${version}$" CHANGELOG.md; then
  echo "CHANGELOG.md 缺少 ## ${version} 段落，请先补充。"
  exit 1
fi

current_version=$(node -p "require('./package.json').version")
if [[ "$current_version" != "$version" ]]; then
  echo "更新版本号为 ${version}"
  npm version "$version" --no-git-tag-version
else
  echo "版本号已是 ${version}，跳过更新"
fi

echo "开始构建产物 (${platform})"
${build_cmd}

artifacts=()
missing_patterns=()
for pattern in "${artifact_patterns[@]}"; do
  matches=($pattern)
  if [[ ${#matches[@]} -eq 0 ]]; then
    missing_patterns+=("$pattern")
  else
    artifacts+=("${matches[@]}")
  fi
  unset matches
 done

if [[ ${#missing_patterns[@]} -gt 0 ]]; then
  echo "未找到构建产物，缺少匹配: ${missing_patterns[*]}"
  exit 1
fi

echo "生成 Release 说明"
node -e "const fs=require('fs');const version='${version}';const lines=fs.readFileSync('CHANGELOG.md','utf8').split(/\r?\n/);const header=`## ${version}`;let start=-1;for(let i=0;i<lines.length;i+=1){if(lines[i].trim()===header){start=i;break;}}if(start<0){console.error(`未找到 ${header} 段落`);process.exit(1);}let output=lines.slice(start).join('\n');for(let i=start+1;i<lines.length;i+=1){if(lines[i].trim().startsWith('## ')){output=lines.slice(start,i).join('\n');break;}}fs.writeFileSync('release-notes.txt',output.trim()+"\n");"

echo "发布 GitHub Release ${tag}"
gh release create "$tag" "${artifacts[@]}" --title "$tag" --notes-file release-notes.txt --target main

rm -f release-notes.txt

echo "发布完成: ${tag}"
