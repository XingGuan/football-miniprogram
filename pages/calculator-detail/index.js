// pages/calculator-detail/index.js - 模拟选号记录详情
const matchApi = require('../../api/match')
const userStore = require('../../store/user')

Page({
  data: {
    recordId: null,
    record: null,
    loading: true,
    error: null,
    recommending: false,
    isFromHall: false, // 是否从大厅来
    exporting: false // 是否正在导出图片
  },

  onLoad(options) {
    // 运行测试用例（开发时使用，上线前注释掉）
    //this.runBonusCalculationTests()

    const id = options.id
    const from = options.from
    if (!id) {
      this.setData({ loading: false, error: '参数错误' })
      return
    }
    this.setData({
      recordId: id,
      isFromHall: from === 'hall'
    })

    this.loadRecord(id)
  },

  /**
   * 运行中奖金额计算测试用例
   * 验证不同场景下的计算准确性
   */
  runBonusCalculationTests() {
    console.log('\n\n========== 开始运行中奖金额计算测试 ==========\n')

    // 测试用例1：单关 - 2场比赛各选1个选项，全部命中
    this.testCase1()

    // 测试用例2：2串1 - 2场比赛各选1个选项，全部命中
    this.testCase2()

    // 测试用例3：3串1 + 4串1 - 4场比赛，全部命中
    this.testCase3()

    // 测试用例4：混合玩法 - 同场选择胜平负和让球胜平负
    this.testCase4()

    // 测试用例5：多选项 - 同场同玩法选多个选项
    this.testCase5()

    // 测试用例6：3串1 + 2串1 混合
    this.testCase6()

    // 测试用例7：比分玩法
    this.testCase7()

    // 测试用例8：部分场次未命中导致未中奖
    this.testCase8()

    // 测试用例9：同场同玩法选多个，只有部分命中
    this.testCase9()

    // 测试用例10：冲突场景 - had H 和 hhad A 不能同时命中
    this.testCase10()

    // 测试用例11：复杂场景 - 4串1、5串1、6串1
    this.testCase11()

    console.log('\n========== 测试完成 ==========\n')
  },

  /**
   * 测试用例1：单关
   * 2场比赛，各选1个选项，全部命中
   * 预期：场1赔率1.5 + 场2赔率2.0 = (1.5 + 2.0) * 2 * 1 = 7.00
   */
  testCase1() {
    console.log('\n--- 测试用例1：单关 ---')
    const record = {
      status: 1,
      multiple: 1,
      passTypes: ['single'],
      matchDetails: [
        {
          matchId: 1001,
          homeTeamName: '主队A',
          awayTeamName: '客队A',
          options: [
            { optionType: 'had', optionValue: 'H', odds: 1.5, checked: true, isHit: true }
          ]
        },
        {
          matchId: 1002,
          homeTeamName: '主队B',
          awayTeamName: '客队B',
          options: [
            { optionType: 'had', optionValue: 'A', odds: 2.0, checked: true, isHit: true }
          ]
        }
      ]
    }

    const result = this.calculateActualBonus(record)
    const expected = '7.00'
    console.log(`预期: ${expected}, 实际: ${result}, ${result === expected ? '✅ 通过' : '❌ 失败'}`)
  },

  /**
   * 测试用例2：2串1
   * 2场比赛，各选1个选项，全部命中
   * 预期：1.5 * 2.0 * 2 * 1 = 6.00
   */
  testCase2() {
    console.log('\n--- 测试用例2：2串1 ---')
    const record = {
      status: 1,
      multiple: 1,
      passTypes: ['2_1'],
      matchDetails: [
        {
          matchId: 1001,
          homeTeamName: '主队A',
          awayTeamName: '客队A',
          options: [
            { optionType: 'had', optionValue: 'H', odds: 1.5, checked: true, isHit: true }
          ]
        },
        {
          matchId: 1002,
          homeTeamName: '主队B',
          awayTeamName: '客队B',
          options: [
            { optionType: 'had', optionValue: 'A', odds: 2.0, checked: true, isHit: true }
          ]
        }
      ]
    }

    const result = this.calculateActualBonus(record)
    const expected = '6.00'
    console.log(`预期: ${expected}, 实际: ${result}, ${result === expected ? '✅ 通过' : '❌ 失败'}`)
  },

  /**
   * 测试用例3：3串1 + 4串1 同时
   * 4场比赛，全部命中，倍数2
   * 3串1组合数：C(4,3) = 4
   * 4串1组合数：C(4,4) = 1
   * 赔率：1.5, 2.0, 1.8, 2.2
   * 3串1奖金：
   *   (1.5*2.0*1.8) + (1.5*2.0*2.2) + (1.5*1.8*2.2) + (2.0*1.8*2.2) = 5.4 + 6.6 + 5.94 + 7.92 = 25.86
   * 4串1奖金：
   *   1.5*2.0*1.8*2.2 = 11.88
   * 总计：(25.86 + 11.88) * 2 * 2 = 150.96
   */
  testCase3() {
    console.log('\n--- 测试用例3：3串1 + 4串1 ---')
    const record = {
      status: 1,
      multiple: 2,
      passTypes: ['3_1', '4_1'],
      matchDetails: [
        {
          matchId: 1001,
          homeTeamName: '主队A',
          awayTeamName: '客队A',
          options: [
            { optionType: 'had', optionValue: 'H', odds: 1.5, checked: true, isHit: true }
          ]
        },
        {
          matchId: 1002,
          homeTeamName: '主队B',
          awayTeamName: '客队B',
          options: [
            { optionType: 'had', optionValue: 'A', odds: 2.0, checked: true, isHit: true }
          ]
        },
        {
          matchId: 1003,
          homeTeamName: '主队C',
          awayTeamName: '客队C',
          options: [
            { optionType: 'had', optionValue: 'D', odds: 1.8, checked: true, isHit: true }
          ]
        },
        {
          matchId: 1004,
          homeTeamName: '主队D',
          awayTeamName: '客队D',
          options: [
            { optionType: 'had', optionValue: 'H', odds: 2.2, checked: true, isHit: true }
          ]
        }
      ]
    }

    const result = this.calculateActualBonus(record)
    const expected = '150.96'
    console.log(`预期: ${expected}, 实际: ${result}, ${result === expected ? '✅ 通过' : '❌ 失败'}`)
  },

  /**
   * 测试用例4：混合玩法（符合冲突规则）
   *
   * 冲突规则（同场不能同时命中）：
   *   - 胜(had H) 和 让负(hhad A) 冲突
   *   - 平(had D) 和 让平(hhad D) 冲突
   *   - 负(had A) 和 让胜(hhad H) 冲突
   *
   * 合理组合示例：
   *   - 胜(H) + 让胜(H)：比分2:0，让1球后1:0，仍胜
   *   - 胜(H) + 让平(D)：比分2:1，让1球后1:1，平
   *   - 平(D) + 让负(A)：比分1:1，让1球后0:1，负
   *   - 负(A) + 让负(A)：比分0:2，让-1球后1:2，仍负
   *
   * 本测试用例：
   * 场1：had=H(1.5)命中，hhad=D(2.5)命中（主胜，让球后平 - 合理）
   * 场2：had=A(2.0)命中，hhad=A(1.6)命中（客胜，让球后仍客胜 - 合理）
   *
   * 玩法路径（票）：
   *   票1(had-had)：1.5 * 2.0 = 3.0 ✓
   *   票2(had-hhad)：1.5 * 1.6 = 2.4 ✓
   *   票3(hhad-had)：2.5 * 2.0 = 5.0 ✓
   *   票4(hhad-hhad)：2.5 * 1.6 = 4.0 ✓
   * 总计：(3.0 + 2.4 + 5.0 + 4.0) * 2 = 28.80
   */
  testCase4() {
    console.log('\n--- 测试用例4：混合玩法（符合冲突规则）---')
    const record = {
      status: 1,
      multiple: 1,
      passTypes: ['2_1'],
      matchDetails: [
        {
          matchId: 1001,
          homeTeamName: '主队A',
          awayTeamName: '客队A',
          options: [
            // 主胜 + 让球平（如比分2:1，让1球后1:1）- 合理组合
            { optionType: 'had', optionValue: 'H', odds: 1.5, checked: true, isHit: true },
            { optionType: 'hhad', optionValue: 'D', odds: 2.5, checked: true, isHit: true }
          ]
        },
        {
          matchId: 1002,
          homeTeamName: '主队B',
          awayTeamName: '客队B',
          options: [
            // 客胜 + 让球客胜（如比分0:2，让-1球后1:2）- 合理组合
            { optionType: 'had', optionValue: 'A', odds: 2.0, checked: true, isHit: true },
            { optionType: 'hhad', optionValue: 'A', odds: 1.6, checked: true, isHit: true }
          ]
        }
      ]
    }

    const result = this.calculateActualBonus(record)
    const expected = '28.80'
    console.log(`预期: ${expected}, 实际: ${result}, ${result === expected ? '✅ 通过' : '❌ 失败'}`)
  },

  /**
   * 测试用例5：同玩法多选项
   * 2场比赛，场1选胜和平，场2选胜
   * 场1：胜(1.5)命中，平(3.0)未命中
   * 场2：胜(2.0)命中
   * 2串1：只有1.5 * 2.0 = 3.0 命中
   * 总计：3.0 * 2 = 6.00
   */
  testCase5() {
    console.log('\n--- 测试用例5：同玩法多选项 ---')
    const record = {
      status: 1,
      multiple: 1,
      passTypes: ['2_1'],
      matchDetails: [
        {
          matchId: 1001,
          homeTeamName: '主队A',
          awayTeamName: '客队A',
          options: [
            { optionType: 'had', optionValue: 'H', odds: 1.5, checked: true, isHit: true },
            { optionType: 'had', optionValue: 'D', odds: 3.0, checked: true, isHit: false }
          ]
        },
        {
          matchId: 1002,
          homeTeamName: '主队B',
          awayTeamName: '客队B',
          options: [
            { optionType: 'had', optionValue: 'H', odds: 2.0, checked: true, isHit: true }
          ]
        }
      ]
    }

    const result = this.calculateActualBonus(record)
    const expected = '6.00'
    console.log(`预期: ${expected}, 实际: ${result}, ${result === expected ? '✅ 通过' : '❌ 失败'}`)
  },

  /**
   * 测试用例6：3串1 + 2串1 混合
   * 3场比赛，全部命中
   * 3串1只有1个组合，2串1有3个组合
   * 赔率：1.5, 2.0, 1.8
   * 3串1：1.5 * 2.0 * 1.8 = 5.4
   * 2串1：(1.5*2.0) + (1.5*1.8) + (2.0*1.8) = 3.0 + 2.7 + 3.6 = 9.3
   * 总计：(5.4 + 9.3) * 2 * 1 = 29.40
   */
  testCase6() {
    console.log('\n--- 测试用例6：3串1 + 2串1 混合 ---')
    const record = {
      status: 1,
      multiple: 1,
      passTypes: ['3_1', '2_1'],
      matchDetails: [
        {
          matchId: 1001,
          homeTeamName: '主队A',
          awayTeamName: '客队A',
          options: [
            { optionType: 'had', optionValue: 'H', odds: 1.5, checked: true, isHit: true }
          ]
        },
        {
          matchId: 1002,
          homeTeamName: '主队B',
          awayTeamName: '客队B',
          options: [
            { optionType: 'had', optionValue: 'A', odds: 2.0, checked: true, isHit: true }
          ]
        },
        {
          matchId: 1003,
          homeTeamName: '主队C',
          awayTeamName: '客队C',
          options: [
            { optionType: 'had', optionValue: 'D', odds: 1.8, checked: true, isHit: true }
          ]
        }
      ]
    }

    const result = this.calculateActualBonus(record)
    const expected = '29.40'
    console.log(`预期: ${expected}, 实际: ${result}, ${result === expected ? '✅ 通过' : '❌ 失败'}`)
  },

  /**
   * 测试用例7：比分玩法
   * 2串1，2场比赛选比分
   * 场1：比分1:0(6.5)命中
   * 场2：比分2:1(7.0)命中
   * 总计：6.5 * 7.0 * 2 = 91.00
   */
  testCase7() {
    console.log('\n--- 测试用例7：比分玩法 ---')
    const record = {
      status: 1,
      multiple: 1,
      passTypes: ['2_1'],
      matchDetails: [
        {
          matchId: 1001,
          homeTeamName: '主队A',
          awayTeamName: '客队A',
          options: [
            { optionType: 'crs', optionValue: '1:0', odds: 6.5, checked: true, isHit: true }
          ]
        },
        {
          matchId: 1002,
          homeTeamName: '主队B',
          awayTeamName: '客队B',
          options: [
            { optionType: 'crs', optionValue: '2:1', odds: 7.0, checked: true, isHit: true }
          ]
        }
      ]
    }

    const result = this.calculateActualBonus(record)
    const expected = '91.00'
    console.log(`预期: ${expected}, 实际: ${result}, ${result === expected ? '✅ 通过' : '❌ 失败'}`)
  },

  /**
   * 测试用例8：3串1但只有2场命中
   * 应该返回0（3串1需要全部命中）
   */
  testCase8() {
    console.log('\n--- 测试用例8：3串1只有2场命中 ---')
    const record = {
      status: 1, // 虽然标记为中奖状态，但实际计算应为0
      multiple: 1,
      passTypes: ['3_1'],
      matchDetails: [
        {
          matchId: 1001,
          homeTeamName: '主队A',
          awayTeamName: '客队A',
          options: [
            { optionType: 'had', optionValue: 'H', odds: 1.5, checked: true, isHit: true }
          ]
        },
        {
          matchId: 1002,
          homeTeamName: '主队B',
          awayTeamName: '客队B',
          options: [
            { optionType: 'had', optionValue: 'A', odds: 2.0, checked: true, isHit: true }
          ]
        },
        {
          matchId: 1003,
          homeTeamName: '主队C',
          awayTeamName: '客队C',
          options: [
            { optionType: 'had', optionValue: 'H', odds: 1.8, checked: true, isHit: false }
          ]
        }
      ]
    }

    const result = this.calculateActualBonus(record)
    const expected = '0.00'
    console.log(`预期: ${expected}, 实际: ${result}, ${result === expected ? '✅ 通过' : '❌ 失败'}`)
  },

  /**
   * 测试用例9：2串1，每场选2个，只有1个命中
   * 场1：选胜(1.5)命中、选平(3.0)未命中
   * 场2：选胜(2.0)命中、选平(3.5)未命中
   * 结果：只有 1.5 * 2.0 = 3.0 这注命中
   * 总计：3.0 * 2 = 6.00
   */
  testCase9() {
    console.log('\n--- 测试用例9：同玩法多选项，部分命中 ---')
    const record = {
      status: 1,
      multiple: 1,
      passTypes: ['2_1'],
      matchDetails: [
        {
          matchId: 1001,
          homeTeamName: '主队A',
          awayTeamName: '客队A',
          options: [
            { optionType: 'had', optionValue: 'H', odds: 1.5, checked: true, isHit: true },
            { optionType: 'had', optionValue: 'D', odds: 3.0, checked: true, isHit: false }
          ]
        },
        {
          matchId: 1002,
          homeTeamName: '主队B',
          awayTeamName: '客队B',
          options: [
            { optionType: 'had', optionValue: 'H', odds: 2.0, checked: true, isHit: true },
            { optionType: 'had', optionValue: 'D', odds: 3.5, checked: true, isHit: false }
          ]
        }
      ]
    }

    const result = this.calculateActualBonus(record)
    const expected = '6.00'
    console.log(`预期: ${expected}, 实际: ${result}, ${result === expected ? '✅ 通过' : '❌ 失败'}`)
  },

  /**
   * 测试用例10：冲突场景验证
   *
   * 场景：用户选了 had H(胜) 和 hhad A(让负)
   * 根据冲突规则，这两个不可能同时命中
   *
   * 假设服务端数据有误，同时标记两个为命中（实际不应发生）
   * 代码应该正确按照 isHit 标记计算
   *
   * 场1：选 had H(1.5)命中，选 hhad A(2.5) 命中（数据异常）
   * 场2：选 had H(2.0)命中
   *
   * 2串1 计算：
   *   票1(had-had)：1.5 * 2.0 = 3.0 ✓
   *   票2(hhad-had)：2.5 * 2.0 = 5.0 ✓ （虽然冲突但代码按isHit计算）
   *
   * 注意：这种情况在实际中不应发生，服务端应保证数据正确性
   * 但代码层面会按 isHit 标记如实计算
   * 总计：(3.0 + 5.0) * 2 = 16.00
   */
  testCase10() {
    console.log('\n--- 测试用例10：冲突场景（异常数据测试）---')
    const record = {
      status: 1,
      multiple: 1,
      passTypes: ['2_1'],
      matchDetails: [
        {
          matchId: 1001,
          homeTeamName: '主队A',
          awayTeamName: '客队A',
          options: [
            // 警告：had H 和 hhad A 实际不能同时命中，这是异常数据
            { optionType: 'had', optionValue: 'H', odds: 1.5, checked: true, isHit: true },
            { optionType: 'hhad', optionValue: 'A', odds: 2.5, checked: true, isHit: true }
          ]
        },
        {
          matchId: 1002,
          homeTeamName: '主队B',
          awayTeamName: '客队B',
          options: [
            { optionType: 'had', optionValue: 'H', odds: 2.0, checked: true, isHit: true }
          ]
        }
      ]
    }

    const result = this.calculateActualBonus(record)
    // 代码按 isHit 如实计算，不做冲突校验（应由服务端保证）
    const expected = '16.00'
    console.log(`预期: ${expected}, 实际: ${result}, ${result === expected ? '✅ 通过' : '❌ 失败'}`)
    console.log('  注意：此测试验证代码按isHit如实计算，冲突校验应由服务端保证')
  },

  /**
   * 测试用例11：复杂场景 - 4串1、5串1、6串1
   *
   * 6场比赛配置：
   * 场1：胜平，命中胜              had [H✓(2.0), D(3.0)]
   * 场2：平+半全场平平，都命中      had [D✓(3.0)], hafu [DD✓(4.0)]
   * 场3：总进球3,4，命中3球        ttg [3✓(5.0), 4(6.0)]
   * 场4：比分2:2,2:3，命中2:2      crs [2:2✓(10.0), 2:3(12.0)]
   * 场5：让胜让负，命中让胜         hhad [H✓(2.0), A(3.0)]
   * 场6：胜+比分3:2，都命中         had [H✓(2.0)], crs [3:2✓(8.0)]
   *
   * 玩法路径（4张票）：
   * 票1: had-had-ttg-crs-hhad-had → 赔率[2,3,5,10,2,2]
   * 票2: had-had-ttg-crs-hhad-crs → 赔率[2,3,5,10,2,8]
   * 票3: had-hafu-ttg-crs-hhad-had → 赔率[2,4,5,10,2,2]
   * 票4: had-hafu-ttg-crs-hhad-crs → 赔率[2,4,5,10,2,8]
   *
   * 6串1计算（每票1个组合）：
   *   票1: 2×3×5×10×2×2 = 1200
   *   票2: 2×3×5×10×2×8 = 4800
   *   票3: 2×4×5×10×2×2 = 1600
   *   票4: 2×4×5×10×2×8 = 6400
   *   小计: 14000 × 2 = 28000
   *
   * 5串1计算（每票C(6,5)=6个组合）：
   *   票1 [2,3,5,10,2,2]: 600+400+240+120+600+600 = 2560
   *   票2 [2,3,5,10,2,8]: 2400+1600+960+480+2400+600 = 8440
   *   票3 [2,4,5,10,2,2]: 800+400+320+160+800+800 = 3280
   *   票4 [2,4,5,10,2,8]: 3200+1600+1280+640+3200+800 = 10720
   *   小计: 25000 × 2 = 50000
   *
   * 4串1计算（每票C(6,4)=15个组合）：
   *   票1: 2184
   *   票2: 5796
   *   票3: 2672
   *   票4: 6968
   *   小计: 17620 × 2 = 35240
   *
   * 总计: 28000 + 50000 + 35240 = 113240
   */
  testCase11() {
    console.log('\n--- 测试用例11：复杂场景 4串1+5串1+6串1 ---')
    const record = {
      status: 1,
      multiple: 1,
      passTypes: ['4_1', '5_1', '6_1'],
      matchDetails: [
        {
          // 场1：胜平，命中胜
          matchId: 1001,
          homeTeamName: '主队1',
          awayTeamName: '客队1',
          options: [
            { optionType: 'had', optionValue: 'H', odds: 2.0, checked: true, isHit: true },
            { optionType: 'had', optionValue: 'D', odds: 3.0, checked: true, isHit: false }
          ]
        },
        {
          // 场2：平+半全场平平，都命中
          matchId: 1002,
          homeTeamName: '主队2',
          awayTeamName: '客队2',
          options: [
            { optionType: 'had', optionValue: 'D', odds: 3.0, checked: true, isHit: true },
            { optionType: 'hafu', optionValue: 'DD', odds: 4.0, checked: true, isHit: true }
          ]
        },
        {
          // 场3：总进球3,4，命中3球
          matchId: 1003,
          homeTeamName: '主队3',
          awayTeamName: '客队3',
          options: [
            { optionType: 'ttg', optionValue: '3', odds: 5.0, checked: true, isHit: true },
            { optionType: 'ttg', optionValue: '4', odds: 6.0, checked: true, isHit: false }
          ]
        },
        {
          // 场4：比分2:2,2:3，命中2:2
          matchId: 1004,
          homeTeamName: '主队4',
          awayTeamName: '客队4',
          options: [
            { optionType: 'crs', optionValue: '2:2', odds: 10.0, checked: true, isHit: true },
            { optionType: 'crs', optionValue: '2:3', odds: 12.0, checked: true, isHit: false }
          ]
        },
        {
          // 场5：让胜让负，命中让胜
          matchId: 1005,
          homeTeamName: '主队5',
          awayTeamName: '客队5',
          options: [
            { optionType: 'hhad', optionValue: 'H', odds: 2.0, checked: true, isHit: true },
            { optionType: 'hhad', optionValue: 'A', odds: 3.0, checked: true, isHit: false }
          ]
        },
        {
          // 场6：胜+比分3:2，都命中
          matchId: 1006,
          homeTeamName: '主队6',
          awayTeamName: '客队6',
          options: [
            { optionType: 'had', optionValue: 'H', odds: 2.0, checked: true, isHit: true },
            { optionType: 'crs', optionValue: '3:2', odds: 8.0, checked: true, isHit: true }
          ]
        }
      ]
    }

    const result = this.calculateActualBonus(record)
    const expected = '113240.00'
    console.log(`预期: ${expected}, 实际: ${result}, ${result === expected ? '✅ 通过' : '❌ 失败'}`)

    // 分项验证
    console.log('  分项计算:')
    console.log('    6串1: 28000')
    console.log('    5串1: 50000')
    console.log('    4串1: 35240')
    console.log('    总计: 113240')
  },

  // 直接调用API获取记录
  async loadRecord(id) {
    try {
      const res = await matchApi.getCalculatorRecords(id)
      const records = res.data || res || []
      

      const record = records.find(r => String(r.id) === String(id))
     //('找到记录:', record)

      if (record) {
        this.processRecord(record)
      } else {
        this.setData({ loading: false, error: '记录不存在' })
      }
    } catch (err) {
      console.error('加载记录失败:', err)
      this.setData({ loading: false, error: '加载失败' })
    }
  },

  // 处理记录数据
  processRecord(record) {
    // 深拷贝，避免修改原数据
    const data = JSON.parse(JSON.stringify(record))

    // 格式化过关方式
    data.passTypesStr = this.formatPassTypes(data.passTypes)
    // 格式化时间
    data.createTimeStr = this.formatTime(data.createTime)
    // 计算预计奖金范围
    data.bonusRange = this.calculateBonusRange(data)

    // 处理比赛详情中的选项显示
    if (data.matchDetails) {
      data.matchDetails = data.matchDetails.map(match => {
        const options = (match.options || []).map(opt => ({
          ...opt,
          displayValue: this.getValueName(opt.optionType, opt.optionValue),
          isHit: opt.isHit === 1
        }))

        // 按玩法类型分组
        const optionGroups = this.groupOptionsByType(options)

        return {
          ...match,
          options,
          optionGroups
        }
      })
    }

    // 计算实际中奖金额
    data.actualBonus = this.calculateActualBonus(data)

    this.setData({ record: data, loading: false })
  },

/**
   * 计算实际中奖金额
   *
   * 规则说明：
   * 1. 支持多种串关方式：单关、2串1、3串1、4串1、5串1、6串1等
   * 2. 每场比赛支持多种玩法：胜平负(had)、让球胜平负(hhad)、比分(crs)、总进球(ttg)、半全场(hafu)
   * 3. 同一玩法类型内只能有一个选项命中（比赛结果唯一）
   * 4. 不同玩法类型可以同时命中（如：胜平负的"胜"和让球胜平负的"让负"可同时命中）
   * 5. 彩票按玩法路径分票：每张票上每场比赛只能选择一种玩法类型
   * 6. 串关需要该票上所有场次都命中才能中奖
   */
  calculateActualBonus(record) {
    console.log('===== 开始计算实际中奖金额 =====')
    console.log('记录状态:', record.status, '(1=中奖, 2=未中奖, 0=待开奖)')

    // 状态不是已中奖，返回0
    if (record.status !== 1) {
      console.log('状态不是中奖，返回0')
      return '0.00'
    }

    if (!record.matchDetails || record.matchDetails.length === 0) {
      console.log('无比赛详情，返回0')
      return '0.00'
    }

    const multiple = record.multiple || 1
    const passTypes = record.passTypes || []
    const matchDetails = record.matchDetails

    console.log('投注倍数:', multiple)
    console.log('过关方式:', passTypes)
    console.log('比赛场次:', matchDetails.length)

    // 第一步：收集每场比赛的命中选项（按玩法类型分组）
    // 结构：hitOptionsByMatch[matchId][playType] = { value, odds }
    const hitOptionsByMatch = {}
    const matchIds = []

    for (const match of matchDetails) {
      if (!match.options) continue

      const matchId = String(match.matchId)
      matchIds.push(matchId)
      hitOptionsByMatch[matchId] = {}

      console.log(`\n场次 ${matchId} (${match.homeTeamName} vs ${match.awayTeamName}):`)

      for (const opt of match.options) {
        // 只处理选中(checked)且命中(isHit)的选项
        if (opt.checked !== false && opt.isHit === true) {
          const playType = opt.optionType
          const odds = opt.odds || 1

          // 记录该玩法类型的命中选项
          // 同一玩法类型只会有一个命中（比赛结果唯一）
          hitOptionsByMatch[matchId][playType] = {
            value: opt.optionValue,
            odds: odds
          }

          console.log(`  [命中] ${playType}: ${opt.optionValue} @ ${odds}`)
        }
      }

      // 检查该场是否有任何命中
      const hitPlayTypes = Object.keys(hitOptionsByMatch[matchId])
      if (hitPlayTypes.length === 0) {
        console.log(`  该场无命中选项`)
      } else {
        console.log(`  命中玩法类型: ${hitPlayTypes.join(', ')}`)
      }
    }

    // 第二步：构建每场比赛的选项分组（用于确定票的结构）
    // 结构：matchPlayTypes[matchId][playType] = [{ value, odds, checked }]
    const matchPlayTypes = {}

    for (const match of matchDetails) {
      const matchId = String(match.matchId)
      matchPlayTypes[matchId] = {}

      for (const opt of match.options || []) {
        if (opt.checked === false) continue // 跳过未选中的选项

        const playType = opt.optionType
        if (!matchPlayTypes[matchId][playType]) {
          matchPlayTypes[matchId][playType] = []
        }

        matchPlayTypes[matchId][playType].push({
          value: opt.optionValue,
          odds: opt.odds || 1,
          isHit: opt.isHit === true
        })
      }
    }

    console.log('\n选项分组:', JSON.stringify(matchPlayTypes, null, 2))

    // 第三步：生成所有玩法路径（每条路径代表一张票）
    // 每张票上，每场比赛只能选择一种玩法类型
    const playTypePaths = this.generatePlayTypePaths(matchIds, matchPlayTypes)
    console.log(`\n生成了 ${playTypePaths.length} 条玩法路径(票)`)

    // 第四步：对每种过关方式、每张票计算中奖金额
    let totalBonus = 0

    for (const passType of passTypes) {
      console.log(`\n--- 计算过关方式: ${passType} ---`)

      if (passType === 'single') {
        // 单关计算：每个命中的选项独立计算
        const singleBonus = this.calculateSingleBonus(matchIds, matchPlayTypes, hitOptionsByMatch, multiple)
        console.log(`单关中奖金额: ${singleBonus}`)
        totalBonus += singleBonus
      } else {
        // 串关计算
        const [m] = passType.split('_').map(Number)
        if (matchIds.length < m) {
          console.log(`场次数(${matchIds.length})不足${m}串1要求，跳过`)
          continue
        }

        const parlayBonus = this.calculateParlayBonus(
          matchIds,
          m,
          playTypePaths,
          matchPlayTypes,
          hitOptionsByMatch,
          multiple
        )
        console.log(`${passType} 中奖金额: ${parlayBonus}`)
        totalBonus += parlayBonus
      }
    }

    console.log(`\n===== 总中奖金额: ${totalBonus.toFixed(2)} =====`)
    return totalBonus.toFixed(2)
  },

  /**
   * 生成所有玩法路径组合
   * 每条路径表示一张票，记录每场比赛选择的玩法类型
   */
  generatePlayTypePaths(matchIds, matchPlayTypes) {
    if (matchIds.length === 0) return [{}]

    const [firstMatchId, ...restMatchIds] = matchIds
    const firstPlayTypes = Object.keys(matchPlayTypes[firstMatchId] || {})

    if (firstPlayTypes.length === 0) {
      return this.generatePlayTypePaths(restMatchIds, matchPlayTypes)
    }

    const restPaths = this.generatePlayTypePaths(restMatchIds, matchPlayTypes)
    const result = []

    for (const playType of firstPlayTypes) {
      for (const restPath of restPaths) {
        result.push({
          ...restPath,
          [firstMatchId]: playType
        })
      }
    }

    return result
  },

  /**
   * 计算单关中奖金额
   * 单关：每个命中的选项独立计算奖金
   */
  calculateSingleBonus(matchIds, matchPlayTypes, hitOptionsByMatch, multiple) {
    let bonus = 0

    for (const matchId of matchIds) {
      const playTypes = matchPlayTypes[matchId] || {}
      const hitOptions = hitOptionsByMatch[matchId] || {}

      for (const playType of Object.keys(playTypes)) {
        // 检查该玩法类型是否命中
        if (hitOptions[playType]) {
          const hitOdds = hitOptions[playType].odds
          const hitValue = hitOptions[playType].value

          // 该玩法类型下选中的选项
          const selectedOptions = playTypes[playType] || []

          // 找到命中的选项（选中且命中）
          const hitOption = selectedOptions.find(opt => opt.isHit === true)

          if (hitOption) {
            // 单关中奖：2元基础 * 赔率 * 倍数
            const winAmount = 2 * hitOdds * multiple
            console.log(`  单关命中: 场次${matchId} ${playType}=${hitValue} @ ${hitOdds}, 奖金=${winAmount}`)
            bonus += winAmount
          }
        }
      }
    }

    return bonus
  },

  /**
   * 计算串关中奖金额
   * 串关：需要票上所有场次的选项都命中
   */
  calculateParlayBonus(matchIds, m, playTypePaths, matchPlayTypes, hitOptionsByMatch, multiple) {
    let totalBonus = 0

    // 获取所有m场组合
    const matchCombinations = this.getCombinations(matchIds, m)
    console.log(`  ${m}串1: 共${matchCombinations.length}个${m}场组合`)

    // 遍历每张票（每条玩法路径）
    for (let pathIndex = 0; pathIndex < playTypePaths.length; pathIndex++) {
      const path = playTypePaths[pathIndex]
      console.log(`  票${pathIndex + 1} 玩法路径:`, path)

      // 遍历每个m场组合
      for (const combo of matchCombinations) {
        // 检查这个组合在该票上是否全部命中
        const comboBonus = this.calculateComboBonus(
          combo,
          path,
          matchPlayTypes,
          hitOptionsByMatch,
          multiple
        )

        if (comboBonus > 0) {
          totalBonus += comboBonus
        }
      }
    }

    return totalBonus
  },

  /**
   * 计算单个组合的中奖金额
   * 需要组合中所有场次都命中才能中奖
   */
  calculateComboBonus(combo, path, matchPlayTypes, hitOptionsByMatch, multiple) {
    // 检查组合中每场是否都命中
    // 同时收集命中的赔率用于计算

    // 存储每场命中选项的赔率列表
    // 如果某场在该票的玩法类型下有多个选中选项，需要全部展开计算
    const matchHitOddsList = []

    for (const matchId of combo) {
      const playType = path[matchId]
      if (!playType) {
        // 该票在该场没有选择玩法
        return 0
      }

      const hitOptions = hitOptionsByMatch[matchId] || {}
      const hitForType = hitOptions[playType]

      if (!hitForType) {
        // 该场该玩法类型没有命中
        return 0
      }

      // 该玩法类型下选中的选项
      const selectedOptions = (matchPlayTypes[matchId] || {})[playType] || []

      // 找出选中且命中的选项
      const hitSelectedOptions = selectedOptions.filter(opt => opt.isHit === true)

      if (hitSelectedOptions.length === 0) {
        // 没有选中的选项命中
        return 0
      }

      // 收集命中选项的赔率（通常只有一个，因为比赛结果唯一）
      const hitOdds = hitSelectedOptions.map(opt => opt.odds)
      matchHitOddsList.push(hitOdds)
    }

    // 所有场次都命中，计算奖金
    // 需要计算所有赔率组合的乘积之和
    const oddsProducts = this.calculateOddsProducts(matchHitOddsList)
    let comboBonus = 0

    for (const product of oddsProducts) {
      const winAmount = 2 * product * multiple
      comboBonus += winAmount
    }

    if (comboBonus > 0) {
      console.log(`    组合 [${combo.join(',')}] 命中, 奖金=${comboBonus}`)
    }

    return comboBonus
  },

  /**
   * 计算赔率乘积的所有组合
   * 输入：[[1.5, 2.0], [1.8], [2.2, 1.9]] 表示3场，第1场有2个赔率选项
   * 输出：所有组合的乘积数组
   */
  calculateOddsProducts(matchOddsList) {
    if (matchOddsList.length === 0) return [1]

    const [firstOdds, ...restOdds] = matchOddsList
    const restProducts = this.calculateOddsProducts(restOdds)

    const results = []
    for (const odds of firstOdds) {
      for (const restProduct of restProducts) {
        results.push(odds * restProduct)
      }
    }

    return results
  },

  // 格式化过关方式
  formatPassTypes(passTypes) {
    if (!passTypes || !Array.isArray(passTypes)) return ''
    const map = {
      'single': '单关',
      '2_1': '2串1',
      '3_1': '3串1',
      '4_1': '4串1',
      '5_1': '5串1',
      '6_1': '6串1'
    }
    return passTypes.map(p => map[p] || p).join(' / ')
  },

  // 格式化时间
  formatTime(timeStr) {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  },

  // 计算预计奖金范围（参考选号页面的计算逻辑）
  // 最大奖金考虑互斥：同一场比赛同一玩法类型只能命中一个结果
  calculateBonusRange(record) {
    if (!record.matchDetails || record.matchDetails.length === 0) return ''

    const multiple = record.multiple || 1
    const passTypes = record.passTypes || []
    const matchDetails = record.matchDetails

    if (passTypes.length === 0) return ''

    // 构建选项数据（只计算 checked=true 的选项）
    const selections = {}
    const matchIds = []

    matchDetails.forEach(match => {
      const matchId = String(match.matchId)
      matchIds.push(matchId)
      // 只筛选 checked=true 的选项
      selections[matchId] = (match.options || [])
        .filter(opt => opt.checked !== false)
        .map(opt => ({
          type: opt.optionType,
          value: opt.optionValue,
          odds: opt.odds || 1
        }))
    })

    // 计算最小奖金：所有单注组合中最小的
    let allBonusResults = []
    passTypes.forEach(passType => {
      const bonusResults = this.calculatePassTypeBonusResults(passType, matchIds, selections)
      allBonusResults = allBonusResults.concat(bonusResults)
    })

    if (allBonusResults.length === 0) return ''
    const validResults = allBonusResults.filter(r => r > 0)
    if (validResults.length === 0) return ''

    const minBonus = (Math.min(...validResults) * 2 * multiple).toFixed(2)

    // 计算最大奖金：
    // 1. 确定最优命中选项：每场比赛取赔率最高的选项作为"命中选项"
    // 2. 对于每张票（每条玩法路径），计算在这种命中情况下的奖金
    //    - 票上包含命中选项的组合才算中奖
    // 3. 所有票的奖金加起来

    // 确定每场的最优命中选项
    const hitSelections = {}
    matchIds.forEach(matchId => {
      const allOpts = selections[matchId] || []
      if (allOpts.length === 0) return
      const maxOddsOpt = allOpts.reduce((max, opt) => opt.odds > max.odds ? opt : max, allOpts[0])
      hitSelections[matchId] = maxOddsOpt
    })

    // 计算所有票在最优命中情况下的奖金
    let maxTotalBonus = 0
    passTypes.forEach(passType => {
      const bonus = this.calculateMaxBonusForPassType(passType, matchIds, selections, hitSelections)
      maxTotalBonus += bonus
    })

    const maxBonus = (maxTotalBonus * 2 * multiple).toFixed(2)

    return `${minBonus} ~ ${maxBonus}`
  },

  // 计算某种过关方式在最优命中情况下的最大奖金
  calculateMaxBonusForPassType(passType, matchIds, selections, hitSelections) {
    if (passType === 'single') {
      // 单关：只有命中选项的那一注中奖，但每场都有一注
      let bonus = 0
      matchIds.forEach(matchId => {
        const hitOpt = hitSelections[matchId]
        if (hitOpt && hitOpt.odds > 0) {
          bonus += hitOpt.odds
        }
      })
      return bonus
    }

    // 串关计算
    const [m] = passType.split('_').map(Number)
    if (matchIds.length < m) return 0

    // 按玩法类型分组每场的选项
    const matchPlayTypes = {}
    matchIds.forEach(matchId => {
      matchPlayTypes[matchId] = {}
      const matchSelections = selections[matchId] || []
      matchSelections.forEach(sel => {
        if (!matchPlayTypes[matchId][sel.type]) {
          matchPlayTypes[matchId][sel.type] = []
        }
        matchPlayTypes[matchId][sel.type].push(sel)
      })
    })

    // 获取所有玩法路径（每条路径代表一张票）
    const playTypePaths = this.getPlayTypePaths(matchIds, matchPlayTypes)

    let totalBonus = 0

    // 对于每张票，计算在最优命中情况下的奖金
    playTypePaths.forEach(path => {
      // 获取这张票上每场的选项
      const pathSelections = {}
      matchIds.forEach(matchId => {
        const playType = path[matchId]
        pathSelections[matchId] = matchPlayTypes[matchId][playType]
      })

      // 判断这张票上每场是否命中（票上的选项是否包含命中选项）
      const matchHitStatus = {}
      matchIds.forEach(matchId => {
        const hitOpt = hitSelections[matchId]
        const ticketOpts = pathSelections[matchId] || []
        // 检查票上的选项是否包含命中选项
        matchHitStatus[matchId] = ticketOpts.some(opt =>
          opt.type === hitOpt.type && opt.value === hitOpt.value
        )
      })

      // 获取m场组合
      const matchCombinations = this.getCombinations(matchIds, m)

      matchCombinations.forEach(combo => {
        // 检查这个组合中的所有场次是否都命中
        const allHit = combo.every(matchId => matchHitStatus[matchId])
        if (!allHit) return

        // 这个组合命中，计算奖金（使用命中选项的赔率）
        let product = 1
        combo.forEach(matchId => {
          product *= hitSelections[matchId].odds
        })
        totalBonus += product
      })
    })

    return totalBonus
  },

  // 计算某种过关方式的奖金结果
  calculatePassTypeBonusResults(passType, matchIds, selections) {
    if (passType === 'single') {
      // 单关：每个选项独立计算
      let bonusResults = []
      matchIds.forEach(matchId => {
        const matchSelections = selections[matchId] || []
        matchSelections.forEach(sel => {
          if (sel.odds > 0) bonusResults.push(sel.odds)
        })
      })
      return bonusResults
    }

    // 串关计算
    const [m] = passType.split('_').map(Number)
    if (matchIds.length < m) return []

    // 按玩法类型分组每场的选项
    const matchPlayTypes = {}
    matchIds.forEach(matchId => {
      matchPlayTypes[matchId] = {}
      const matchSelections = selections[matchId] || []
      matchSelections.forEach(sel => {
        if (!matchPlayTypes[matchId][sel.type]) {
          matchPlayTypes[matchId][sel.type] = []
        }
        matchPlayTypes[matchId][sel.type].push(sel)
      })
    })

    // 获取所有可能的"玩法路径"
    const playTypePaths = this.getPlayTypePaths(matchIds, matchPlayTypes)

    let bonusResults = []

    playTypePaths.forEach(path => {
      const pathSelections = {}
      matchIds.forEach(matchId => {
        const playType = path[matchId]
        pathSelections[matchId] = matchPlayTypes[matchId][playType]
      })

      // 获取m场组合
      const matchCombinations = this.getCombinations(matchIds, m)

      matchCombinations.forEach(combo => {
        const oddsComboList = this.getOddsCombinationsForPath(combo, pathSelections)
        oddsComboList.forEach(oddsList => {
          const product = oddsList.reduce((p, o) => p * o, 1)
          if (product > 0) bonusResults.push(product)
        })
      })
    })

    return bonusResults
  },

  // 获取所有玩法路径组合
  getPlayTypePaths(matchIds, matchPlayTypes) {
    if (matchIds.length === 0) return [{}]

    const [first, ...rest] = matchIds
    const firstPlayTypes = Object.keys(matchPlayTypes[first])
    const restPaths = this.getPlayTypePaths(rest, matchPlayTypes)

    const result = []
    firstPlayTypes.forEach(playType => {
      restPaths.forEach(restPath => {
        result.push({
          ...restPath,
          [first]: playType
        })
      })
    })

    return result
  },

  // 获取某条路径下的赔率组合
  getOddsCombinationsForPath(matchIds, pathSelections) {
    if (matchIds.length === 0) return [[]]

    const [first, ...rest] = matchIds
    const firstOdds = pathSelections[first].map(s => s.odds).filter(o => o > 0)
    if (firstOdds.length === 0) firstOdds.push(1)

    const restCombinations = this.getOddsCombinationsForPath(rest, pathSelections)

    const result = []
    firstOdds.forEach(odds => {
      restCombinations.forEach(restOdds => {
        result.push([odds, ...restOdds])
      })
    })

    return result
  },

  // 获取组合
  getCombinations(arr, m) {
    if (m === 1) return arr.map(item => [item])
    if (m === arr.length) return [arr]

    const result = []
    for (let i = 0; i <= arr.length - m; i++) {
      const first = arr[i]
      const rest = arr.slice(i + 1)
      const subCombos = this.getCombinations(rest, m - 1)
      subCombos.forEach(combo => { result.push([first, ...combo]) })
    }
    return result
  },

  // 按玩法类型分组选项
  groupOptionsByType(options) {
    const typeMap = {}
    const typeDescMap = {
      'had': '胜平负',
      'hhad': '让球胜平负',
      'crs': '比分',
      'ttg': '总进球',
      'hafu': '半全场'
    }

    options.forEach(opt => {
      const type = opt.optionType
      if (!typeMap[type]) {
        typeMap[type] = {
          type,
          typeDesc: opt.optionTypeDesc || typeDescMap[type] || type,
          goalLine: opt.goalLine,
          matchResultDesc: opt.matchResultDesc,
          checkTime: opt.checkTime,
          isHit: false,
          options: []
        }
      }
      typeMap[type].options.push({
        value: opt.optionValue,
        displayValue: opt.displayValue,
        odds: opt.odds,
        checked: opt.checked !== false, // 默认为true（兼容旧数据）
        isHit: opt.isHit,
        checkTime: opt.checkTime
      })
      // 更新开奖结果和命中状态
      if (opt.matchResultDesc) {
        typeMap[type].matchResultDesc = opt.matchResultDesc
      }
      if (opt.checkTime) {
        typeMap[type].checkTime = opt.checkTime
      }
      // 只要有一个选中的选项命中，该分组就算命中
      if (opt.checked !== false && opt.isHit) {
        typeMap[type].isHit = true
      }
    })

    return Object.values(typeMap)
  },

  // 获取选项值显示名称
  getValueName(type, value) {
    // 胜平负、让球胜平负
    if (type === 'had' ) {
      const map = { 'H': '胜', 'D': '平', 'A': '负' }
      return map[value] || value
    }
    if(type === 'hhad'){
      const map = { 'H': '让胜', 'D': '让平', 'A': '让负' }
      return map[value] || value
    }
    // 总进球
    if (type === 'ttg') {
      return value === '7' ? '7+球' : `${value}球`
    }
    // 半全场
    if (type === 'hafu') {
      const map = {
        'HH': '胜胜', 'HD': '胜平', 'HA': '胜负',
        'DH': '平胜', 'DD': '平平', 'DA': '平负',
        'AH': '负胜', 'AD': '负平', 'AA': '负负'
      }
      return map[value] || value
    }
    // 比分直接返回
    return value
  },

  // 分享方案
  async onRecommend() {
    const { record } = this.data
    if (!record) {
      wx.showToast({
        title: '记录不存在',
        icon: 'error'
      })
      return
    }

    this.setData({ recommending: true })

    try {
      const res = await matchApi.recommendCalculatorRecord(record.id)
      this.setData({ recommending: false })

      wx.showToast({
        title: '分享成功',
        icon: 'success'
      })
    } catch (err) {
      console.error('分享失败:', err)
      this.setData({ recommending: false })

      wx.showToast({
        title: err.message || '分享失败',
        icon: 'error'
      })
    }
  },

  // 分享给好友
  onShareAppMessage() {
    const { record } = this.data
    if (!record) {
      return {
        title: '我的模拟选号方案',
        path: '/pages/calculator/index'
      }
    }

    const matchCount = record.matchDetails ? record.matchDetails.length : 0
    const statusText = record.status === 1 ? '中奖啦！' : record.status === 2 ? '未中奖' : '待开奖'

    return {
      title: `${statusText} ${matchCount}场比赛 ${record.passTypesStr}`,
      path: `/pages/calculator-detail/index?id=${record.id}`
    }
  },

  // 导出为图片
  async onExportImage() {
    const { record } = this.data
    if (!record) {
      wx.showToast({ title: '记录不存在', icon: 'error' })
      return
    }

    this.setData({ exporting: true })

    try {
      // 请求用户授权保存到相册
      const authResult = await wx.getSetting()
      if (!authResult.authSetting['scope.writePhotosAlbum']) {
        await wx.authorize({ scope: 'scope.writePhotosAlbum' })
      }

      wx.showLoading({ title: '生成图片中...', mask: true })

      // 创建 canvas
      const query = wx.createSelectorQuery()
      query.select('#shareCanvas')
        .fields({ node: true, size: true })
        .exec(async (res) => {
          if (!res || !res[0]) {
            wx.hideLoading()
            wx.showToast({ title: '生成失败', icon: 'error' })
            this.setData({ exporting: false })
            return
          }

          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const dpr = wx.getSystemInfoSync().pixelRatio

          // 设置 canvas 尺寸
          const canvasWidth = 750
          const canvasHeight = await this.calculateCanvasHeight()

          canvas.width = canvasWidth * dpr
          canvas.height = canvasHeight * dpr
          ctx.scale(dpr, dpr)

          // 绘制内容
          await this.drawContent(ctx, canvasWidth, canvasHeight)

          // 导出图片
          wx.canvasToTempFilePath({
            canvas: canvas,
            success: (result) => {
              wx.hideLoading()
              // 保存到相册
              wx.saveImageToPhotosAlbum({
                filePath: result.tempFilePath,
                success: () => {
                  wx.showToast({ title: '已保存到相册', icon: 'success' })
                  this.setData({ exporting: false })
                },
                fail: (err) => {
                  console.error('保存失败:', err)
                  wx.showToast({ title: '保存失败', icon: 'error' })
                  this.setData({ exporting: false })
                }
              })
            },
            fail: (err) => {
              wx.hideLoading()
              console.error('生成图片失败:', err)
              wx.showToast({ title: '生成失败', icon: 'error' })
              this.setData({ exporting: false })
            }
          })
        })
    } catch (error) {
      wx.hideLoading()
      console.error('导出失败:', error)
      if (error.errMsg && error.errMsg.includes('auth')) {
        wx.showModal({
          title: '提示',
          content: '需要授权保存到相册',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting()
            }
          }
        })
      } else {
        wx.showToast({ title: '导出失败', icon: 'error' })
      }
      this.setData({ exporting: false })
    }
  },

  // 计算 canvas 高度
  async calculateCanvasHeight() {
    const { record } = this.data
    let height = 300 // 基础高度（状态卡片 + 投注信息）

    // 计算比赛详情的高度
    if (record.matchDetails) {
      record.matchDetails.forEach(match => {
        height += 200 // 每场比赛基础高度
        if (match.optionGroups) {
          height += match.optionGroups.length * 80 // 每个玩法组
        }
      })
    }

    return Math.min(height, 10000) // 限制最大高度
  },

  // 绘制内容到 canvas
  async drawContent(ctx, width, height) {
    const { record } = this.data

    // 设置背景色
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, width, height)

    let y = 20

    // 绘制状态卡片
    y = this.drawStatusCard(ctx, record, 20, y, width - 40)

    y += 20

    // 绘制投注信息
    y = this.drawBetInfo(ctx, record, 20, y, width - 40)

    y += 20

    // 绘制比赛详情
    y = this.drawMatchDetails(ctx, record, 20, y, width - 40)

    // 绘制底部水印
    ctx.fillStyle = '#999'
    ctx.font = '24px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('足球小程序', width / 2, height - 30)
  },

  // 绘制状态卡片
  drawStatusCard(ctx, record, x, y, cardWidth) {
    const cardHeight = 100

    // 卡片背景
    const bgColor = record.status === 1 ? '#4CAF50' : record.status === 2 ? '#F44336' : '#FF9800'
    ctx.fillStyle = bgColor
    this.roundRect(ctx, x, y, cardWidth, cardHeight, 10)
    ctx.fill()

    // 状态文字
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 32px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(record.statusDesc || '待开奖', x + cardWidth / 2, y + 50)

    // 方案编号
    ctx.font = '24px sans-serif'
    ctx.fillText(`方案编号: ${record.schemeNo || ''}`, x + cardWidth / 2, y + 80)

    return y + cardHeight
  },

  // 绘制投注信息
  drawBetInfo(ctx, record, x, y, cardWidth) {
    const cardHeight = 200

    // 卡片背景
    ctx.fillStyle = '#fff'
    this.roundRect(ctx, x, y, cardWidth, cardHeight, 10)
    ctx.fill()

    // 标题
    ctx.fillStyle = '#333'
    ctx.font = 'bold 28px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('投注信息', x + 20, y + 40)

    // 信息网格
    const infoY = y + 70
    const col1X = x + 20
    const col2X = x + cardWidth / 2 + 10

    ctx.font = '24px sans-serif'
    ctx.fillStyle = '#666'

    ctx.fillText('过关方式:', col1X, infoY)
    ctx.fillStyle = '#333'
    ctx.fillText(record.passTypesStr || '', col1X + 120, infoY)

    ctx.fillStyle = '#666'
    ctx.fillText('投注倍数:', col2X, infoY)
    ctx.fillStyle = '#333'
    ctx.fillText(`${record.multiple || 1}倍`, col2X + 120, infoY)

    ctx.fillStyle = '#666'
    ctx.fillText('总注数:', col1X, infoY + 35)
    ctx.fillStyle = '#333'
    ctx.fillText(`${record.totalBets || 0}注`, col1X + 120, infoY + 35)

    ctx.fillStyle = '#666'
    ctx.fillText('投注金额:', col2X, infoY + 35)
    ctx.fillStyle = '#f44336'
    ctx.fillText(`¥${record.totalAmount || 0}`, col2X + 120, infoY + 35)

    // 中奖金额或预计奖金
    if (record.status === 1) {
      ctx.fillStyle = '#666'
      ctx.fillText('中奖金额:', col1X, infoY + 70)
      ctx.fillStyle = '#4CAF50'
      ctx.font = 'bold 28px sans-serif'
      ctx.fillText(`¥${record.actualBonus || 0}`, col1X + 120, infoY + 70)
    } else if (record.bonusRange) {
      ctx.fillStyle = '#666'
      ctx.font = '24px sans-serif'
      ctx.fillText('预计奖金:', col1X, infoY + 70)
      ctx.fillStyle = '#FF9800'
      ctx.fillText(`¥${record.bonusRange}`, col1X + 120, infoY + 70)
    }

    return y + cardHeight
  },

  // 绘制比赛详情
  drawMatchDetails(ctx, record, x, y, cardWidth) {
    if (!record.matchDetails || record.matchDetails.length === 0) {
      return y
    }

    // 标题
    ctx.fillStyle = '#333'
    ctx.font = 'bold 28px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`比赛详情 (${record.matchDetails.length}场)`, x, y + 30)

    let currentY = y + 60

    record.matchDetails.forEach((match, index) => {
      currentY = this.drawMatchItem(ctx, match, x, currentY, cardWidth, index + 1)
      currentY += 20
    })

    return currentY
  },

  // 绘制单场比赛
  drawMatchItem(ctx, match, x, y, cardWidth, index) {
    const cardHeight = 150 + (match.optionGroups ? match.optionGroups.length * 60 : 0)

    // 卡片背景
    ctx.fillStyle = '#fff'
    this.roundRect(ctx, x, y, cardWidth, cardHeight, 10)
    ctx.fill()

    // 比赛序号和时间
    ctx.fillStyle = '#666'
    ctx.font = '24px sans-serif'
    ctx.fillText(`${match.matchNumStr || ''}`, x + 20, y + 35)
    ctx.fillText(match.matchTime || '', x + cardWidth - 150, y + 35)

    // 队伍名称
    ctx.fillStyle = '#333'
    ctx.font = 'bold 26px sans-serif'
    const teamsText = `${match.homeTeamName || ''} VS ${match.awayTeamName || ''}`
    ctx.fillText(teamsText, x + 20, y + 70)

    // 绘制选项
    let optionY = y + 100
    if (match.optionGroups) {
      match.optionGroups.forEach(group => {
        optionY = this.drawOptionGroup(ctx, group, x + 20, optionY, cardWidth - 40)
      })
    }

    return y + cardHeight
  },

  // 绘制选项组
  drawOptionGroup(ctx, group, x, y, width) {
    ctx.font = '22px sans-serif'

    // 玩法名称
    ctx.fillStyle = '#666'
    const typeText = group.typeDesc + (group.goalLine ? `(${group.goalLine})` : '')
    ctx.fillText(typeText, x, y + 20)

    // 选项
    let optionX = x + 150
    group.options.forEach(opt => {
      if (opt.checked) {
        // 选中的选项
        const bgColor = opt.isHit ? '#4CAF50' : '#FF9800'
        ctx.fillStyle = bgColor
        ctx.fillRect(optionX, y, 80, 30)

        ctx.fillStyle = '#fff'
        ctx.fillText(opt.displayValue, optionX + 10, y + 22)

        optionX += 90
      }
    })

    // 开奖结果
    if (group.matchResultDesc) {
      ctx.fillStyle = group.isHit ? '#4CAF50' : '#F44336'
      ctx.fillText(group.matchResultDesc, x + width - 100, y + 20)
    }

    return y + 40
  },

  // 绘制圆角矩形
  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }
})
