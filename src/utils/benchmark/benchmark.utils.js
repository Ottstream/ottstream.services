class BenchmarkUtils {
  static msDiff(date1, date2) {
    // Calculate the difference in milliseconds
    return date2.getTime() - date1.getTime();
  }
}

module.exports = BenchmarkUtils;
