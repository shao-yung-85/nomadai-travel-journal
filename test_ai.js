/**
 * AI 功能測試腳本
 * 測試所有 AI 相關功能
 */

import { generateTripPlan, generateCoverImage, getAttractionGuide } from './services/gemini.js';
import { geocodeAddress } from './services/geocoding.js';

console.log('🤖 開始測試 AI 功能...\n');

// 測試 1: 行程生成
async function testTripGeneration() {
    console.log('📝 測試 1: 行程生成');
    try {
        const result = await generateTripPlan('台北兩天一夜美食之旅', 'zh-TW');
        console.log('✅ 行程生成成功');
        console.log('   標題:', result.title);
        console.log('   行程項目數:', result.itinerary?.length || 0);
        console.log('   預算:', result.budget?.total || 'N/A');

        if (!result.itinerary || result.itinerary.length === 0) {
            console.error('❌ 警告：行程內容為空');
        }
        if (!result.itinerary?.[0]?.day) {
            console.error('❌ 警告：缺少 day 欄位');
        }

        return true;
    } catch (error) {
        console.error('❌ 行程生成失敗:', error.message);
        return false;
    }
}

// 測試 2: 封面圖片生成
async function testCoverImage() {
    console.log('\n🖼️  測試 2: 封面圖片生成');
    try {
        const imageUrl = await generateCoverImage('台北101夜景');
        console.log('✅ 封面圖片生成成功');
        console.log('   圖片 URL:', imageUrl);

        if (!imageUrl || !imageUrl.startsWith('http')) {
            console.error('❌ 警告：圖片 URL 格式錯誤');
            return false;
        }

        return true;
    } catch (error) {
        console.error('❌ 封面圖片生成失敗:', error.message);
        return false;
    }
}

// 測試 3: 景點指南
async function testAttractionGuide() {
    console.log('\n📖 測試 3: 景點 AI 指南');
    try {
        const guide = await getAttractionGuide('台北', '台北101');
        console.log('✅ 景點指南生成成功');
        console.log('   內容長度:', guide?.length || 0, '字');

        if (!guide || guide.length < 50) {
            console.error('❌ 警告：指南內容過短');
            return false;
        }

        return true;
    } catch (error) {
        console.error('❌ 景點指南生成失敗:', error.message);
        return false;
    }
}

// 測試 4: 地理編碼
async function testGeocoding() {
    console.log('\n🗺️  測試 4: 地理編碼');
    try {
        const coords = await geocodeAddress('台北101');
        console.log('✅ 地理編碼成功');
        console.log('   座標:', coords);

        if (!coords || !coords.lat || !coords.lng) {
            console.error('❌ 警告：座標格式錯誤');
            return false;
        }

        return true;
    } catch (error) {
        console.error('❌ 地理編碼失敗:', error.message);
        return false;
    }
}

// 執行所有測試
async function runAllTests() {
    const results = {
        tripGeneration: await testTripGeneration(),
        coverImage: await testCoverImage(),
        attractionGuide: await testAttractionGuide(),
        geocoding: await testGeocoding()
    };

    console.log('\n\n📊 測試總結');
    console.log('================');
    console.log('行程生成:', results.tripGeneration ? '✅ 通過' : '❌ 失敗');
    console.log('封面圖片:', results.coverImage ? '✅ 通過' : '❌ 失敗');
    console.log('景點指南:', results.attractionGuide ? '✅ 通過' : '❌ 失敗');
    console.log('地理編碼:', results.geocoding ? '✅ 通過' : '❌ 失敗');

    const passedCount = Object.values(results).filter(Boolean).length;
    console.log(`\n總計: ${passedCount}/4 通過`);

    if (passedCount === 4) {
        console.log('🎉 所有測試通過！');
    } else {
        console.error('⚠️  部分測試失敗，請檢查錯誤訊息');
    }
}

// 執行測試
runAllTests().catch(error => {
    console.error('測試執行失敗:', error);
});
